import { STATIC_ASSETS } from '../constants'
import type { LenstubePublication } from '../custom-types'
import sanitizeIpfsUrl from './sanitizeIpfsUrl'

export const getVideoUrl = (video: LenstubePublication) => {
  const url =
    video?.metadata?.media[1]?.original.url ||
    video?.metadata?.media[0]?.original.url
  if (!url) return `${STATIC_ASSETS}/images/fallbackThumbnail.png`
  return sanitizeIpfsUrl(url)
}

export const getPermanentVideoUrl = (video: LenstubePublication) => {
  return sanitizeIpfsUrl(video?.metadata?.media[0]?.original.url)
}

export const getPlaybackIdFromUrl = (video: LenstubePublication) => {
  const url = video?.metadata?.media[1]?.original.url
  if (!url) return null
  const pathname = new URL(url).pathname
  const playbackId = pathname.split('/')[2]
  return playbackId
}

export const getIsIPFSUrl = (url: string) => {
  return url?.includes('ipfs')
}
