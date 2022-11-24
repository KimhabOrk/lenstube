import Alert from '@components/Common/Alert'
import CheckOutline from '@components/Common/Icons/CheckOutline'
import { Loader } from '@components/UIElements/Loader'
import { Listbox, Transition } from '@headlessui/react'
import useAppStore from '@lib/store'
import {
  PublicationMainFocus,
  PublicationTypes,
  useProfilePostsQuery
} from 'lens'
import type { FC } from 'react'
import React, { Fragment } from 'react'
import { useInView } from 'react-cool-inview'
import type { LenstubePublication, TokenGatingCondition } from 'utils'
import { LENS_CUSTOM_FILTERS, SCROLL_ROOT_MARGIN } from 'utils'

type Props = {
  condition: TokenGatingCondition
  position: number
}

const CollectedPosts: FC<Props> = ({ condition, position }) => {
  const selectedChannel = useAppStore((state) => state.selectedChannel)
  const uploadedVideo = useAppStore((state) => state.uploadedVideo)
  const setUploadedVideo = useAppStore((state) => state.setUploadedVideo)

  const request = {
    publicationTypes: [PublicationTypes.Post],
    limit: 32,
    metadata: { mainContentFocus: [PublicationMainFocus.Video] },
    customFilters: LENS_CUSTOM_FILTERS,
    profileId: selectedChannel?.id
  }

  const { data, loading, error, fetchMore } = useProfilePostsQuery({
    variables: {
      request
    },
    skip: !selectedChannel?.id
  })

  const channelVideos = data?.publications?.items as LenstubePublication[]
  const pageInfo = data?.publications?.pageInfo

  const { observe } = useInView({
    rootMargin: SCROLL_ROOT_MARGIN,
    onEnter: async () => {
      await fetchMore({
        variables: {
          request: {
            ...request,
            cursor: pageInfo?.next
          }
        }
      })
    }
  })

  const onSelectPublication = (data: string) => {
    const publicationId = data.split('__')[0]
    const publicationTitle = data.split('__')[1]
    const conditions = uploadedVideo.tokenGating.accessConditions
    conditions[position] = {
      ...conditions[position],
      collected: { publicationId, selected: true, title: publicationTitle }
    }
    setUploadedVideo({
      ...uploadedVideo,
      tokenGating: {
        ...uploadedVideo.tokenGating,
        accessConditions: conditions
      }
    })
  }

  if (loading) return <Loader className="my-10" />
  if (error) return <Alert variant="danger">Failed to fetch!</Alert>
  if (!channelVideos.length) return null

  return (
    <div>
      <Listbox
        value={condition.collected.publicationId}
        onChange={(data) => onSelectPublication(data)}
      >
        <div className="relative mt-1">
          <Listbox.Button className="relative w-full py-2 pl-4 pr-10 text-left border dark:border-gray-700 border-gray-300 rounded-xl focus:outline-none sm:text-sm">
            <span className="block truncate">
              {condition.collected.title || 'Select a video'}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <CheckOutline className="w-3 h-3" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute shadow w-full py-1 mt-1 z-[1] overflow-auto text-base bg-white dark:bg-gray-900 rounded-xl max-h-52 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {channelVideos?.map((video: LenstubePublication) => (
                <Listbox.Option
                  key={video.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pr-10 pl-4 ${
                      active ? 'bg-gray-100 dark:bg-gray-800' : ''
                    }`
                  }
                  value={`${video.id}__${video.metadata?.name}`}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {video.metadata?.name}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <CheckOutline className="w-3 h-3" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
              {pageInfo?.next &&
              channelVideos.length !== pageInfo?.totalCount ? (
                <span ref={observe} className="flex justify-center p-10">
                  <Loader />
                </span>
              ) : null}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}

export default CollectedPosts