import { getThumbnailUrl, imageCdn, trimify } from '@tape.xyz/generic'
import type { MirrorablePublication } from '@tape.xyz/lens'
import type { MobileThemeConfig } from '@tape.xyz/lens/custom-types'
import { Image as ExpoImage } from 'expo-image'
import type { FC } from 'react'
import React from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import UserProfile from '~/components/common/UserProfile'
import { getShortHandTime } from '~/helpers/format-time'
import normalizeFont from '~/helpers/normalize-font'
import { useMobileTheme } from '~/hooks'

const BORDER_RADIUS = 25

const styles = (themeConfig: MobileThemeConfig) =>
  StyleSheet.create({
    poster: {
      borderRadius: BORDER_RADIUS,
      aspectRatio: 1 / 1,
      borderColor: themeConfig.borderColor,
      borderWidth: 0.5
    },
    title: {
      color: themeConfig.textColor,
      fontFamily: 'font-bold',
      fontSize: normalizeFont(14),
      letterSpacing: 0.5,
      textAlign: 'center'
    },
    description: {
      fontFamily: 'font-normal',
      fontSize: normalizeFont(12),
      color: themeConfig.secondaryTextColor,
      paddingTop: 10
    },
    thumbnail: {
      width: '100%',
      height: 215,
      borderRadius: BORDER_RADIUS,
      borderColor: themeConfig.borderColor,
      borderWidth: 0.5
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
  audio: MirrorablePublication
}

const Item: FC<Props> = ({ audio }) => {
  const { width } = useWindowDimensions()
  const { themeConfig } = useMobileTheme()
  const style = styles(themeConfig)

  return (
    <View style={{ width }}>
      <View
        style={{
          paddingHorizontal: 15,
          alignItems: 'center'
        }}
      >
        <Text numberOfLines={1} style={style.title}>
          {trimify(audio.metadata.marketplace?.name ?? '')}
        </Text>
        <View style={style.otherInfoContainer}>
          <UserProfile profile={audio.by} size={15} radius={3} />
          <Text style={{ color: themeConfig.secondaryTextColor, fontSize: 3 }}>
            {'\u2B24'}
          </Text>
          <Text style={style.otherInfo}>{audio.stats.reactions} likes</Text>
          <Text style={{ color: themeConfig.secondaryTextColor, fontSize: 3 }}>
            {'\u2B24'}
          </Text>
          <Text style={style.otherInfo}>
            {getShortHandTime(audio.createdAt)}
          </Text>
        </View>
      </View>
      <View
        style={{
          paddingTop: 20,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <View style={[style.poster, { height: width * 0.6 }]}>
          <ExpoImage
            source={{
              uri: imageCdn(getThumbnailUrl(audio.metadata), 'SQUARE')
            }}
            transition={300}
            contentFit="cover"
            style={[style.poster, { height: width * 0.6 }]}
          />
        </View>
      </View>
    </View>
  )
}

export default Item
