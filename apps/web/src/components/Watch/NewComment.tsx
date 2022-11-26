import { LENSHUB_PROXY_ABI } from '@abis/LensHubProxy'
import { Button } from '@components/UIElements/Button'
import InputMentions from '@components/UIElements/InputMentions'
import { zodResolver } from '@hookform/resolvers/zod'
import usePendingTxn from '@hooks/usePendingTxn'
import useAppStore from '@lib/store'
import usePersistStore from '@lib/store/persist'
import { utils } from 'ethers'
import type {
  CreateCommentBroadcastItemResult,
  CreatePublicCommentRequest
} from 'lens'
import {
  PublicationMainFocus,
  PublicationMetadataDisplayTypes,
  useBroadcastMutation,
  useCreateCommentTypedDataMutation,
  useCreateCommentViaDispatcherMutation
} from 'lens'
import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import type { CustomErrorWithData, LenstubePublication } from 'utils'
import {
  Analytics,
  ERROR_MESSAGE,
  LENSHUB_PROXY_ADDRESS,
  LENSTUBE_APP_ID,
  LENSTUBE_WEBSITE_URL,
  RELAYER_ENABLED,
  TRACK
} from 'utils'
import getProfilePicture from 'utils/functions/getProfilePicture'
import getTextNftUrl from 'utils/functions/getTextNftUrl'
import getUserLocale from 'utils/functions/getUserLocale'
import omitKey from 'utils/functions/omitKey'
import trimify from 'utils/functions/trimify'
import uploadToAr from 'utils/functions/uploadToAr'
import logger from 'utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { useContractWrite, useSignTypedData } from 'wagmi'
import { z } from 'zod'

type Props = {
  video: LenstubePublication
  refetchComments: () => void
}
const formSchema = z.object({
  comment: z
    .string({ required_error: 'Enter valid comment' })
    .trim()
    .min(1, { message: 'Enter valid comment' })
    .max(5000, { message: 'Comment should not exceed 5000 characters' })
})
type FormData = z.infer<typeof formSchema>

const NewComment: FC<Props> = ({ video, refetchComments }) => {
  const [loading, setLoading] = useState(false)
  const [buttonText, setButtonText] = useState('Comment')
  const selectedChannel = useAppStore((state) => state.selectedChannel)
  const selectedChannelId = usePersistStore((state) => state.selectedChannelId)
  const userSigNonce = useAppStore((state) => state.userSigNonce)
  const setUserSigNonce = useAppStore((state) => state.setUserSigNonce)

  const {
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<FormData>({
    defaultValues: {
      comment: ''
    },
    resolver: zodResolver(formSchema)
  })

  const onError = (error: CustomErrorWithData) => {
    toast.error(error?.data?.message ?? error?.message ?? ERROR_MESSAGE)
    setButtonText('Comment')
    setLoading(false)
  }

  const { signTypedDataAsync } = useSignTypedData({
    onError
  })

  const { write: writeComment, data: writeCommentData } = useContractWrite({
    address: LENSHUB_PROXY_ADDRESS,
    abi: LENSHUB_PROXY_ABI,
    functionName: 'commentWithSig',
    mode: 'recklesslyUnprepared',
    onSuccess: () => {
      setButtonText('Indexing...')
      reset()
    }
  })

  const [broadcast, { data: broadcastData }] = useBroadcastMutation({
    onError
  })

  const [createCommentViaDispatcher, { data: dispatcherData }] =
    useCreateCommentViaDispatcherMutation({
      onError
    })

  const broadcastTxId =
    broadcastData?.broadcast.__typename === 'RelayerResult'
      ? broadcastData?.broadcast?.txId
      : null
  const dispatcherTxId =
    dispatcherData?.createCommentViaDispatcher.__typename === 'RelayerResult'
      ? dispatcherData?.createCommentViaDispatcher?.txId
      : null

  const { indexed } = usePendingTxn({
    txHash: writeCommentData?.hash,
    txId: broadcastTxId ?? dispatcherTxId
  })

  useEffect(() => {
    if (indexed) {
      setLoading(false)
      refetchComments()
      setButtonText('Comment')
      reset()
      toast.success('Commented successfully.')
      Analytics.track(TRACK.NEW_COMMENT)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexed])

  const [createCommentTypedData] = useCreateCommentTypedDataMutation({
    onCompleted: async (data) => {
      const { typedData, id } =
        data.createCommentTypedData as CreateCommentBroadcastItemResult
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
      setButtonText('Signing...')
      try {
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
        setButtonText('Commenting...')
        setUserSigNonce(userSigNonce + 1)
        if (!RELAYER_ENABLED) {
          return writeComment?.({ recklesslySetUnpreparedArgs: [args] })
        }
        const { data } = await broadcast({
          variables: { request: { id, signature } }
        })
        if (data?.broadcast?.__typename === 'RelayError')
          writeComment?.({ recklesslySetUnpreparedArgs: [args] })
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

  const submitComment = async (data: FormData) => {
    try {
      setButtonText('Uploading...')
      setLoading(true)

      const textNftImageUrl = await getTextNftUrl(
        trimify(data.comment),
        selectedChannel?.handle,
        new Date().toLocaleString()
      )

      const url = await uploadToAr({
        version: '2.0.0',
        metadata_id: uuidv4(),
        description: trimify(data.comment),
        content: trimify(data.comment),
        locale: getUserLocale(),
        mainContentFocus: PublicationMainFocus.TextOnly,
        external_url: `${LENSTUBE_WEBSITE_URL}/watch/${video?.id}`,
        image: textNftImageUrl,
        imageMimeType: 'image/svg+xml',
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
      setButtonText('Commenting...')
      const request = {
        profileId: selectedChannel?.id,
        publicationId: video?.id,
        contentURI: url,
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

  if (!selectedChannel || !selectedChannelId) return null

  return (
    <div className="my-1">
      <form
        onSubmit={handleSubmit(submitComment)}
        className="flex items-start mb-2 space-x-1 md:space-x-3"
      >
        <div className="flex-none">
          <img
            src={getProfilePicture(selectedChannel, 'avatar')}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full"
            draggable={false}
            alt={selectedChannel?.handle}
          />
        </div>
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
        <Button disabled={loading}>{buttonText}</Button>
      </form>
    </div>
  )
}

export default NewComment
