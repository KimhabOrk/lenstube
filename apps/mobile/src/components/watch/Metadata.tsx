import {
  getPublication,
  getPublicationData,
  trimNewLines
} from '@tape.xyz/generic'
import type { AnyPublication } from '@tape.xyz/lens'
import type { MobileThemeConfig } from '@tape.xyz/lens/custom-types'
import type { FC } from 'react'
import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { getRelativeTime } from '~/helpers/format-time'
import normalizeFont from '~/helpers/normalize-font'
import { useMobileTheme } from '~/hooks'

import RenderMarkdown from '../common/markdown/RenderMarkdown'
import UserProfile from '../common/UserProfile'

const styles = (themeConfig: MobileThemeConfig) =>
  StyleSheet.create({
    title: {
      color: themeConfig.textColor,
      fontFamily: 'font-bold',
      fontSize: normalizeFont(13),
      letterSpacing: 0.5
    },
    description: {
      fontFamily: 'font-normal',
      fontSize: normalizeFont(12),
      color: themeConfig.secondaryTextColor,
      paddingTop: 10
    },
    otherInfoContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 10,
      opacity: 0.8
    },
    otherInfo: {
      fontFamily: 'font-normal',
      fontSize: normalizeFont(10),
      color: themeConfig.textColor
    }
  })

type Props = {
  video: AnyPublication
}

const Metadata: FC<Props> = ({ video }) => {
  const { themeConfig } = useMobileTheme()
  const style = styles(themeConfig)

  const [showMore, setShowMore] = useState(false)
  const publication = getPublication(video)
  const metadata = getPublicationData(publication.metadata)

  return (
    <View style={{ paddingVertical: 15 }}>
      <Text style={style.title}>{metadata?.title}</Text>
      {metadata?.content && (
        <Pressable onPress={() => setShowMore(!showMore)}>
          <Text
            numberOfLines={!showMore ? 2 : undefined}
            style={style.description}
          >
            {showMore ? (
              <RenderMarkdown
                content={metadata?.content}
                textStyle={style.description}
              />
            ) : (
              trimNewLines(metadata?.content)
            )}
          </Text>
        </Pressable>
      )}
      <View style={style.otherInfoContainer}>
        <UserProfile profile={video.by} size={15} radius={3} />
        <Text style={{ color: themeConfig.secondaryTextColor, fontSize: 3 }}>
          {'\u2B24'}
        </Text>
        <Text style={style.otherInfo}>{publication.stats.reactions} likes</Text>
        <Text style={{ color: themeConfig.secondaryTextColor, fontSize: 3 }}>
          {'\u2B24'}
        </Text>
        <Text style={style.otherInfo}>{getRelativeTime(video.createdAt)}</Text>
      </View>
    </View>
  )
}

export default Metadata
