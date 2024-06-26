import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import { LENSTUBE_BYTES_APP_ID, STATIC_ASSETS } from '@tape.xyz/constants'
import {
  getIsSensitiveContent,
  getThumbnailUrl,
  getValueFromKeyInAttributes,
  imageCdn,
  trimify,
  trimNewLines
} from '@tape.xyz/generic'
import type { MetadataAttribute, MirrorablePublication } from '@tape.xyz/lens'
import type { MobileThemeConfig } from '@tape.xyz/lens/custom-types'
import { Image as ExpoImage } from 'expo-image'
import type { FC } from 'react'
import React, { memo } from 'react'
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { getRelativeTime, getTimeFromSeconds } from '~/helpers/format-time'
import normalizeFont from '~/helpers/normalize-font'
import { useMobileTheme } from '~/hooks'

import UserProfile from './UserProfile'

type Props = {
  video: MirrorablePublication
}

const BORDER_RADIUS = 10

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
      color: themeConfig.secondaryTextColor
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
      opacity: 0.8
    },
    otherInfo: {
      fontFamily: 'font-normal',
      fontSize: normalizeFont(10),
      color: themeConfig.textColor
    },
    duration: {
      position: 'absolute',
      bottom: 7,
      right: 7,
      borderRadius: 5,
      paddingHorizontal: 5,
      paddingVertical: 3,
      backgroundColor: themeConfig.backgroudColor
    },
    sensitive: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      top: 7,
      right: 7,
      borderRadius: 5,
      paddingHorizontal: 5,
      paddingVertical: 3,
      backgroundColor: themeConfig.backgroudColor
    }
  })

const VideoCard: FC<Props> = ({ video }) => {
  const { navigate } = useNavigation()
  const { themeConfig } = useMobileTheme()
  const style = styles(themeConfig)

  const isBytes = video.publishedOn?.id === LENSTUBE_BYTES_APP_ID
  const isSensitiveContent = getIsSensitiveContent(video?.metadata, video.id)
  const thumbnailUrl = imageCdn(
    isSensitiveContent
      ? `${STATIC_ASSETS}/images/sensor-blur.png`
      : getThumbnailUrl(video.metadata, true),
    isBytes ? 'THUMBNAIL_V' : 'THUMBNAIL'
  )
  const videoDuration = getValueFromKeyInAttributes(
    video.metadata?.marketplace?.attributes as MetadataAttribute[],
    'durationInSeconds'
  )

  return (
    <Pressable onPress={() => navigate('WatchScreen', { id: video.id })}>
      <ImageBackground
        source={{ uri: thumbnailUrl }}
        blurRadius={15}
        imageStyle={{
          opacity: 0.8,
          borderRadius: BORDER_RADIUS
        }}
      >
        <ExpoImage
          source={{ uri: thumbnailUrl }}
          transition={300}
          contentFit={isBytes ? 'contain' : 'cover'}
          style={style.thumbnail}
        />
        {videoDuration && (
          <View style={style.duration}>
            <Text style={style.otherInfo}>
              {getTimeFromSeconds(videoDuration)}
            </Text>
          </View>
        )}
        {isSensitiveContent && (
          <View style={style.sensitive}>
            <Ionicons
              name="eye-off-outline"
              color={themeConfig.textColor}
              size={10}
            />
            <Text style={style.otherInfo}>Sensitive</Text>
          </View>
        )}
      </ImageBackground>

      <View style={{ paddingVertical: 10, paddingHorizontal: 5, gap: 7 }}>
        <Text numberOfLines={3} style={style.title}>
          {trimify(video.metadata?.marketplace?.name ?? '')}
        </Text>
        {video.metadata?.marketplace?.description && (
          <Text numberOfLines={3} style={style.description}>
            {trimNewLines(video.metadata.marketplace?.description)}
          </Text>
        )}
        <View style={style.otherInfoContainer}>
          <UserProfile profile={video.by} size={15} radius={3} />
          <Text style={{ color: themeConfig.secondaryTextColor, fontSize: 3 }}>
            {'\u2B24'}
          </Text>
          <Text style={style.otherInfo}>{video.stats?.reactions} likes</Text>
          <Text style={{ color: themeConfig.secondaryTextColor, fontSize: 3 }}>
            {'\u2B24'}
          </Text>
          <Text style={style.otherInfo}>
            {getRelativeTime(video.createdAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

export default memo(VideoCard)
