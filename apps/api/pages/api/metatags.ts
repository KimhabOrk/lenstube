import getProfileMeta from 'lib/getProfileMeta'
import getPublicationMeta from 'lib/getPublicationMeta'
import type { NextApiRequest, NextApiResponse } from 'next'
import { LENSTUBE_APP_DESCRIPTION } from 'utils'
import getMetaTags from 'utils/functions/getMetaTags'
import { getRandomProfilePicture } from 'utils/functions/getRandomProfilePicture'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') return res.status(405).json({ success: false })

  const path = req.query.path as string
  console.log('🚀 ~ file: metatags.ts ~ line 12 ~ handler ~ path', path)

  if (!path) return res.status(400).json({ success: false })

  const isChannel = path.includes('/channel/')
  const isVideo = path.includes('/watch/')

  try {
    if (isChannel) {
      const handle = path.replace('/channel/', '')
      return getProfileMeta(res, handle)
    }

    if (isVideo) {
      const pubId = path.replace('/watch/', '')
      return getPublicationMeta(res, pubId)
    }

    return res.setHeader('Content-Type', 'text/html').send(
      getMetaTags({
        title: 'Lenstube',
        description: LENSTUBE_APP_DESCRIPTION,
        image: getRandomProfilePicture('Lenstube')
      })
    )
  } catch (error) {
    return res.setHeader('Content-Type', 'text/html').send(
      getMetaTags({
        title: 'Lenstube',
        description: LENSTUBE_APP_DESCRIPTION,
        image: getRandomProfilePicture('Lenstube')
      })
    )
  }
}

export default handler
