import { useNavigation } from '@react-navigation/native'
import { LENS_CUSTOM_FILTERS } from '@tape.xyz/constants'
import { getThumbnailUrl, imageCdn } from '@tape.xyz/generic'
import {
  type ExplorePublicationRequest,
  ExplorePublicationsOrderByType,
  ExplorePublicationType,
  LimitType,
  type MirrorablePublication,
  PublicationMetadataMainFocusType,
  useExplorePublicationsQuery
} from '@tape.xyz/lens'
import type { MobileThemeConfig } from '@tape.xyz/lens/custom-types'
import { Image as ExpoImage } from 'expo-image'
import { Gyroscope } from 'expo-sensors'
import { Skeleton } from 'moti/skeleton'
import React, { useCallback, useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring
} from 'react-native-reanimated'

import haptic from '~/helpers/haptic'
import { colors } from '~/helpers/theme'
import { useMobileTheme, usePlatform } from '~/hooks'
import useMobileStore from '~/store'

import UserProfile from '../common/UserProfile'
import AnimatedPressable from '../ui/AnimatedPressable'
import ServerError from '../ui/ServerError'

const BORDER_RADIUS = 20

const styles = (themeConfig: MobileThemeConfig) =>
  StyleSheet.create({
    profile: {
      width: '100%',
      position: 'absolute',
      bottom: 0,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: 10,
      borderBottomRightRadius: BORDER_RADIUS,
      borderBottomLeftRadius: BORDER_RADIUS
    },
    thumbnail: {
      width: '100%',
      height: '100%',
      borderRadius: BORDER_RADIUS,
      backgroundColor: themeConfig.backgroudColor2
    },
    cardsContainer: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 30
    },
    backgroundCards: {
      position: 'absolute',
      width: 170,
      opacity: 0.5,
      aspectRatio: 9 / 16,
      borderRadius: BORDER_RADIUS,
      overflow: 'hidden'
    },
    firstCard: {
      width: 200,
      marginBottom: 10,
      aspectRatio: 9 / 16,
      borderRadius: BORDER_RADIUS,
      overflow: 'hidden'
    }
  })

const ByteCards = () => {
  const { themeConfig } = useMobileTheme()
  const style = styles(themeConfig)
  const { navigate } = useNavigation()
  const { isIOS } = usePlatform()
  const homeGradientColor = useMobileStore((state) => state.homeGradientColor)

  const prevGyroValue = useSharedValue({
    x: 0,
    y: 0
  })
  const gyroValue = useSharedValue({
    x: 0,
    y: 0
  })

  const derivedTranslations = useDerivedValue(() => {
    'worklet'
    const MAX_X = 40
    const MAX_Y = 20

    let newX = prevGyroValue.value.x + gyroValue.value.y * -2
    let newY = prevGyroValue.value.y + gyroValue.value.x * -2

    if (Math.abs(newX) >= MAX_X) {
      newX = prevGyroValue.value.x
    }
    if (Math.abs(newY) >= MAX_Y) {
      newY = prevGyroValue.value.y
    }
    prevGyroValue.value = {
      x: newX,
      y: newY
    }
    return {
      x: newX,
      y: newY
    }
  }, [gyroValue.value])

  useEffect(() => {
    let subscription: { remove: () => void }
    if (isIOS) {
      subscription = Gyroscope.addListener(({ x, y }) => {
        gyroValue.value = { x, y }
      })
    }
    return () => {
      if (isIOS) {
        subscription.remove()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gyroValue.value])

  const AnimatedStyles = {
    motion: useAnimatedStyle(() => {
      const inputRange = [-100, 0, 100]
      const outputRange = [-10, 0, 10] // reduce to slow down the translation
      const springConfig = {
        damping: 10,
        stiffness: 80,
        mass: 1,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01
      }
      return {
        transform: [
          {
            translateX: withSpring(
              interpolate(derivedTranslations.value.x, inputRange, outputRange),
              springConfig
            )
          },
          {
            translateY: withSpring(
              interpolate(derivedTranslations.value.y, inputRange, outputRange),
              springConfig
            )
          }
        ]
      }
    })
  }

  const renderCard = useCallback(
    (byte: MirrorablePublication) => {
      return (
        <>
          <ExpoImage
            source={{
              uri: imageCdn(getThumbnailUrl(byte.metadata, true), 'THUMBNAIL_V')
            }}
            contentFit="cover"
            transition={300}
            style={style.thumbnail}
          />
          <View style={style.profile}>
            <UserProfile
              profile={byte.by}
              size={14}
              radius={3}
              handleStyle={{ fontFamily: 'font-bold', color: colors.white }}
              imageStyle={{
                borderWidth: 0
              }}
            />
          </View>
        </>
      )
    },
    [style]
  )

  const request: ExplorePublicationRequest = {
    limit: LimitType.Ten,
    orderBy: ExplorePublicationsOrderByType.LensCurated,
    where: {
      publicationTypes: [ExplorePublicationType.Post],
      customFilters: LENS_CUSTOM_FILTERS,
      metadata: {
        mainContentFocus: [PublicationMetadataMainFocusType.ShortVideo]
      }
    }
  }

  const { data, loading, error } = useExplorePublicationsQuery({
    variables: { request }
  })

  if (error) {
    return <ServerError />
  }

  const bytes = data?.explorePublications
    ?.items as unknown as MirrorablePublication[]

  return (
    <View style={style.cardsContainer}>
      <View style={{ zIndex: 1 }}>
        <Skeleton
          show={loading}
          colors={[`${homeGradientColor}10`, themeConfig.backgroudColor2]}
          radius={BORDER_RADIUS}
        >
          <AnimatedPressable
            onPress={() => {
              haptic()
              navigate('MainTab', {
                screen: 'BytesStack',
                params: { screen: 'Bytes' }
              })
            }}
          >
            {isIOS ? (
              <Animated.View style={[AnimatedStyles.motion, style.firstCard]}>
                {bytes?.length && renderCard(bytes[0])}
              </Animated.View>
            ) : (
              <View style={style.firstCard}>
                {bytes?.length && renderCard(bytes[0])}
              </View>
            )}
          </AnimatedPressable>
        </Skeleton>
      </View>
      <Pressable
        onPress={() => {
          haptic()
          navigate('MainTab', {
            screen: 'BytesStack',
            params: { screen: 'Bytes' }
          })
        }}
        style={[
          style.backgroundCards,
          {
            left: 20
          }
        ]}
      >
        {bytes?.length && renderCard(bytes[1])}
      </Pressable>
      <Pressable
        onPress={() => {
          haptic()
          navigate('MainTab', {
            screen: 'BytesStack',
            params: { screen: 'Bytes' }
          })
        }}
        style={[
          style.backgroundCards,
          {
            right: 20
          }
        ]}
      >
        {bytes?.length && renderCard(bytes[2])}
      </Pressable>
    </View>
  )
}

export default ByteCards
