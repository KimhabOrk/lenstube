import { LENSHUB_PROXY_ABI } from '@abis/LensHubProxy'
import { useApolloClient } from '@apollo/client'
import { Button } from '@components/UIElements/Button'
import EmojiPicker from '@components/UIElements/EmojiPicker'
import InputMentions from '@components/UIElements/InputMentions'
import { zodResolver } from '@hookform/resolvers/zod'
import useAppStore from '@lib/store'
import usePersistStore from '@lib/store/persist'
import { utils } from 'ethers'
import type { CreatePublicCommentRequest, Publication } from 'lens'
import {
  PublicationDetailsDocument,
  PublicationMainFocus,
  PublicationMetadataDisplayTypes,
  useBroadcastDataAvailabilityMutation,
  useBroadcastMutation,
  useCreateCommentTypedDataMutation,
  useCreateCommentViaDispatcherMutation,
  useCreateDataAvailabilityCommentTypedDataMutation,
  useCreateDataAvailabilityCommentViaDispatcherMutation,
  usePublicationDetailsLazyQuery
} from 'lens'
import type { FC } from 'react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import type { CustomErrorWithData } from 'utils'
import {
  Analytics,
  ERROR_MESSAGE,
  LENSHUB_PROXY_ADDRESS,
  LENSTUBE_APP_ID,
  LENSTUBE_WEBSITE_URL,
  TRACK
} from 'utils'
import getProfilePicture from 'utils/functions/getProfilePicture'
import getUserLocale from 'utils/functions/getUserLocale'
import omitKey from 'utils/functions/omitKey'
import trimify from 'utils/functions/trimify'
import uploadToAr from 'utils/functions/uploadToAr'
import logger from 'utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { useContractWrite, useSignTypedData } from 'wagmi'
import { z } from 'zod'
type Props = {
  video: Publication
}

const formSchema = z.object({
  comment: z
    .string({ required_error: 'Enter valid comment' })
    .trim()
    .min(1, { message: 'Enter valid comment' })
    .max(5000, { message: 'Comment should not exceed 5000 characters' })
})
type FormData = z.infer<typeof formSchema>

const NewComment: FC<Props> = ({ video }) => {
  const { cache } = useApolloClient()

  const [loading, setLoading] = useState(false)
  const selectedChannel = useAppStore((state) => state.selectedChannel)
  const selectedChannelId = usePersistStore((state) => state.selectedChannelId)
  const queuedComments = usePersistStore((state) => state.queuedComments)
  const setQueuedComments = usePersistStore((state) => state.setQueuedComments)
  const userSigNonce = useAppStore((state) => state.userSigNonce)
  const setUserSigNonce = useAppStore((state) => state.setUserSigNonce)

  const {
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues
  } = useForm<FormData>({
    defaultValues: {
      comment: ''
    },
    resolver: zodResolver(formSchema)
  })

  const setToQueue = (txn: { txnId?: string; txnHash?: string }) => {
    setQueuedComments([
      {
        comment: getValues('comment'),
        txnId: txn.txnId,
        txnHash: txn.txnHash,
        pubId: video.id
      },
      ...(queuedComments || [])
    ])
    reset()
    setLoading(false)
  }

  const onCompleted = (data: any) => {
    if (
      data?.broadcast?.reason === 'NOT_ALLOWED' ||
      data.createCommentViaDispatcher?.reason
    ) {
      return logger.error('[Error Comment Dispatcher]', data)
    }
    Analytics.track(TRACK.PUBLICATION.NEW_COMMENT, {
      publication_id: video.id,
      publication_state: video.isDataAvailability ? 'DATA_ONLY' : 'ON_CHAIN'
    })
    const txnId =
      data?.createCommentViaDispatcher?.txId ?? data?.broadcast?.txId
    return setToQueue({ txnId })
  }

  const onError = (error: CustomErrorWithData) => {
    toast.error(error?.data?.message ?? error?.message ?? ERROR_MESSAGE)
    setLoading(false)
  }

  const { signTypedDataAsync } = useSignTypedData({
    onError
  })

  const { write: writeComment } = useContractWrite({
    address: LENSHUB_PROXY_ADDRESS,
    abi: LENSHUB_PROXY_ABI,
    functionName: 'commentWithSig',
    mode: 'recklesslyUnprepared',
    onError,
    onSuccess: (data) => {
      if (data.hash) {
        setToQueue({ txnHash: data.hash })
      }
    }
  })

  const [broadcast] = useBroadcastMutation({
    onError,
    onCompleted
  })

  const [createCommentViaDispatcher] = useCreateCommentViaDispatcherMutation({
    onError,
    onCompleted
  })

  const [getComment] = usePublicationDetailsLazyQuery()

  const fetchAndCacheComment = async (commentId: string) => {
    const { data } = await getComment({
      variables: {
        request: {
          publicationId: commentId
        }
      }
    })
    if (data?.publication) {
      cache.modify({
        fields: {
          publications() {
            cache.writeQuery({
              data: { publication: data?.publication },
              query: PublicationDetailsDocument
            })
          }
        }
      })
    }
  }

  const [createCommentTypedData] = useCreateCommentTypedDataMutation({
    onCompleted: async ({ createCommentTypedData }) => {
      const { typedData, id } = createCommentTypedData
      const {
        profileId,
        profileIdPointed,
        pubIdPointed,
        contentURI,
        collectModule,
        collectModuleInitData,
        referenceModule,
        referenceModuleData,
        referenceModuleInitData
      } = typedData?.value
      try {
        toast.loading('Requesting signature...')
        const signature = await signTypedDataAsync({
          domain: omitKey(typedData?.domain, '__typename'),
          types: omitKey(typedData?.types, '__typename'),
          value: omitKey(typedData?.value, '__typename')
        })
        const { v, r, s } = utils.splitSignature(signature)
        const args = {
          profileId,
          profileIdPointed,
          pubIdPointed,
          contentURI,
          collectModule,
          collectModuleInitData,
          referenceModule,
          referenceModuleData,
          referenceModuleInitData,
          sig: { v, r, s, deadline: typedData.value.deadline }
        }
        setUserSigNonce(userSigNonce + 1)
        const { data } = await broadcast({
          variables: { request: { id, signature } }
        })
        if (data?.broadcast?.__typename === 'RelayError') {
          writeComment?.({ recklesslySetUnpreparedArgs: [args] })
        }
      } catch {
        setLoading(false)
      }
    },
    onError
  })

  const signTypedData = (request: CreatePublicCommentRequest) => {
    createCommentTypedData({
      variables: { options: { overrideSigNonce: userSigNonce }, request }
    })
  }

  const createViaDispatcher = async (request: CreatePublicCommentRequest) => {
    const { data } = await createCommentViaDispatcher({
      variables: { request }
    })
    if (data?.createCommentViaDispatcher.__typename === 'RelayError') {
      signTypedData(request)
    }
  }

  /**
   * DATA AVAILABILITY STARTS
   */
  const [broadcastDataAvailabilityComment] =
    useBroadcastDataAvailabilityMutation({
      onCompleted: async (data) => {
        if (
          data?.broadcastDataAvailability.__typename ===
          'CreateDataAvailabilityPublicationResult'
        ) {
          const commentId = data?.broadcastDataAvailability.id
          await fetchAndCacheComment(commentId)
        }
        onCompleted(data)
      },
      onError
    })

  const [createDataAvailabilityCommentViaDispatcher] =
    useCreateDataAvailabilityCommentViaDispatcherMutation({
      onCompleted: async (data) => {
        if (
          data?.createDataAvailabilityCommentViaDispatcher.__typename ===
          'CreateDataAvailabilityPublicationResult'
        ) {
          const { id: commentId } =
            data.createDataAvailabilityCommentViaDispatcher
          await fetchAndCacheComment(commentId)
        }
        onCompleted(data)
      },
      onError
    })

  const [createDataAvailabilityCommentTypedData] =
    useCreateDataAvailabilityCommentTypedDataMutation({
      onCompleted: async ({ createDataAvailabilityCommentTypedData }) => {
        const { id, typedData } = createDataAvailabilityCommentTypedData
        toast.loading('Requesting signature...')
        const signature = await signTypedDataAsync({
          domain: omitKey(typedData?.domain, '__typename'),
          types: omitKey(typedData?.types, '__typename'),
          value: omitKey(typedData?.value, '__typename')
        })
        return await broadcastDataAvailabilityComment({
          variables: { request: { id, signature } }
        })
      }
    })
  /**
   * DATA AVAILABILITY ENDS
   */

  const submitComment = async (formData: FormData) => {
    try {
      setLoading(true)
      const metadataUri = await uploadToAr({
        version: '2.0.0',
        metadata_id: uuidv4(),
        description: trimify(formData.comment),
        content: trimify(formData.comment),
        locale: getUserLocale(),
        mainContentFocus: PublicationMainFocus.TextOnly,
        external_url: `${LENSTUBE_WEBSITE_URL}/watch/${video?.id}`,
        image: null,
        imageMimeType: null,
        name: `${selectedChannel?.handle}'s comment on video ${video.metadata.name}`,
        attributes: [
          {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'publication',
            value: 'comment'
          },
          {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'app',
            value: LENSTUBE_APP_ID
          }
        ],
        media: [],
        appId: LENSTUBE_APP_ID
      })

      // Create Data Availability comment
      if (video.isDataAvailability) {
        const dataAvailablityRequest = {
          from: selectedChannel?.id,
          commentOn: video.id,
          contentURI: metadataUri
        }
        const { data } = await createDataAvailabilityCommentViaDispatcher({
          variables: { request: dataAvailablityRequest }
        })
        // Fallback to DA dispatcher error
        if (
          data?.createDataAvailabilityCommentViaDispatcher?.__typename ===
          'RelayError'
        ) {
          return await createDataAvailabilityCommentTypedData({
            variables: { request: dataAvailablityRequest }
          })
        }
        return
      }

      const request = {
        profileId: selectedChannel?.id,
        publicationId: video?.id,
        contentURI: metadataUri,
        collectModule: {
          freeCollectModule: {
            followerOnly: false
          }
        },
        referenceModule: {
          followerOnlyReferenceModule: false
        }
      }
      const canUseDispatcher = selectedChannel?.dispatcher?.canUseRelay
      if (!canUseDispatcher) {
        return signTypedData(request)
      }
      await createViaDispatcher(request)
    } catch (error) {
      logger.error('[Error Store & Post Comment]', error)
    }
  }

  if (!selectedChannel || !selectedChannelId) {
    return null
  }

  return (
    <div className="pb-4">
      <form
        onSubmit={handleSubmit(submitComment)}
        className="mb-2 flex w-full flex-wrap items-start justify-end gap-2"
      >
        <div className="flex flex-1 items-center space-x-2 md:space-x-3">
          <div className="flex-none">
            <img
              src={getProfilePicture(selectedChannel, 'avatar')}
              className="h-9 w-9 rounded-full"
              draggable={false}
              alt={selectedChannel?.handle}
            />
          </div>
          <div className="relative w-full">
            <InputMentions
              placeholder="How's this video?"
              autoComplete="off"
              validationError={errors.comment?.message}
              value={watch('comment')}
              onContentChange={(value) => {
                setValue('comment', value)
                clearErrors('comment')
              }}
              mentionsSelector="input-mentions-single"
            />
            <div className="absolute bottom-2 right-2">
              <EmojiPicker
                onEmojiSelect={(emoji) =>
                  setValue('comment', `${getValues('comment')}${emoji}`)
                }
              />
            </div>
          </div>
        </div>
        <Button loading={loading}>Comment</Button>
      </form>
    </div>
  )
}

export default NewComment