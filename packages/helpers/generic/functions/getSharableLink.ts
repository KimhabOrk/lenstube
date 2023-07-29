import {
  LENSTER_WEBSITE_URL,
  LENSTUBE_APP_NAME,
  LENSTUBE_TWITTER_HANDLE,
  LENSTUBE_WEBSITE_URL
} from '@lenstube/constants'
import type { Publication } from '@lenstube/lens'

const getViewUrl = (video: Publication) => {
  return `${LENSTUBE_WEBSITE_URL}/watch/${video.id}`
}

type Link = 'lenstube' | 'lenster' | 'twitter' | 'reddit' | 'linkedin'

export const getSharableLink = (link: Link, video: Publication) => {
  const { handle, metadata } = video.profile
  if (link === 'lenstube') {
    return `${LENSTUBE_WEBSITE_URL}/watch/${video.id}`
  } else if (link === 'lenster') {
    return `${LENSTER_WEBSITE_URL}/?url=${getViewUrl(video)}&text=${
      (metadata?.name as string) ?? ''
    } by @${handle}&hashtags=Lenstube&preview=true`
  } else if (link === 'twitter') {
    return encodeURI(
      `https://twitter.com/intent/tweet?url=${getViewUrl(video)}&text=${
        (metadata?.name as string) ?? ''
      } by @${handle}&via=${LENSTUBE_TWITTER_HANDLE}&related=Lenstube&hashtags=Lenstube`
    )
  } else if (link === 'reddit') {
    return `https://www.reddit.com/submit?url=${getViewUrl(video)}&title=${
      (metadata?.name as string) ?? ''
    } by @${handle}`
  } else if (link === 'linkedin') {
    return `https://www.linkedin.com/shareArticle/?url=${getViewUrl(
      video
    )} by @${handle}&title=${(metadata?.name as string) ?? ''}&summary=${
      metadata?.description as string
    }&source=${LENSTUBE_APP_NAME}`
  }
  return ''
}
