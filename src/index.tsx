import React, { Component } from 'react'
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Image,
  Easing,
} from 'react-native'
import * as d3Shape from 'd3-shape'

import Svg, { G, Text, TSpan, Path, Pattern } from 'react-native-svg'
import { Font } from './global'

interface WheelOfFortuneProps {
  options: {
    rewards: string[]
    winner?: string
    onRef: (ref: any) => void
    colors?: string[]
    innerRadius?: number
    backgroundColor?: string
    borderWidth?: number
    borderColor?: string
    textColor?: string
    duration?: number
    knobSize?: number
    knobSource?: any
    getWinner?: (value: string, index: number) => void
    playButton: () => JSX.Element
    textSize: number
    additionalTextSize: number
  }
}

interface WheelOfFortuneState {
  enabled: boolean
  started: boolean
  finished: boolean
  winner: string | null
  gameScreen: Animated.Value
  wheelOpacity: Animated.Value
  imageLeft: Animated.Value
  imageTop: Animated.Value
}

const { width, height } = Dimensions.get('screen')

const AnimatedSvg = Animated.createAnimatedComponent(Svg)

class WheelOfFortune extends Component<
  WheelOfFortuneProps,
  WheelOfFortuneState
> {
  private angle: number = 0
  private numberOfSegments!: number
  private fontSize: number = 18
  private oneTurn: number = 360
  private angleBySegment!: number
  private angleOffset!: number
  private _wheelPaths: Array<{
    path: string
    color: string
    value: string
    centroid: [number, number]
  }> = []
  private _angle: Animated.Value = new Animated.Value(0)

  constructor(props: WheelOfFortuneProps) {
    super(props)
    this.state = {
      enabled: false,
      started: false,
      finished: false,
      winner: null,
      gameScreen: new Animated.Value(width - 40),
      wheelOpacity: new Animated.Value(1),
      imageLeft: new Animated.Value(width / 2 - 30),
      imageTop: new Animated.Value(height / 2 - 70),
    }

    this.prepareWheel()
  }

  prepareWheel = () => {
    this.numberOfSegments = this.props.options.rewards?.length;
    this.angleBySegment = this.oneTurn / this.numberOfSegments;
    this.angleOffset = this.angleBySegment / 2;

    if (this.props?.options?.winner) {
      this.winner = this.props?.options?.rewards?.indexOf(
        this.props?.options?.winner,
      );
    } else {
      this.winner = Math.floor(Math.random() * this.numberOfSegments); // Random index
    }

    this._wheelPaths = this.makeWheel();
    this._angle = new Animated.Value(0);

    this.props.options.onRef(this);
  };

  resetWheelState = () => {
    this.setState({
      enabled: false,
      started: false,
      finished: false,
      winner: null,
      gameScreen: new Animated.Value(width - 40),
      wheelOpacity: new Animated.Value(1),
      imageLeft: new Animated.Value(width / 2 - 30),
      imageTop: new Animated.Value(height / 2 - 70),
    })
  }

  _tryAgain = () => {
    this.prepareWheel()
    this.resetWheelState()
    this.angleListener()
    this._onPress()
  }

  angleListener = () => {
    this._angle.addListener((event) => {
      if (this.state.enabled) {
        this.setState({ enabled: false, finished: false })
      }
      this.angle = event.value
    })
  }

  componentWillUnmount() {
    this.props.options.onRef(undefined)
  }

  componentDidMount() {
    this.angleListener()
  }

  makeWheel = () => {
    const data = Array.from({ length: this.numberOfSegments }).fill(1)
    const arcs = d3Shape.pie()(data)
    const colors = this.props.options.colors || [
      '#BBEEFF',
      '#22F471',
      '#FBE7A1',
      '#FE74FE',
      '#A4CBCB',
      '#E2725C',
      '#C7E54A',
      '#709DC6',
      '#FFC5C5',
      '#F1F2F4',
      '#BBEEFF',
      '#D48F8F',
    ]

    return arcs.map((arc, index) => {
      const instance = d3Shape
        .arc()
        .padAngle(0.01)
        .outerRadius(width / 2)
        .innerRadius(this.props.options.innerRadius || 100)
      return {
        path: instance(arc)!,
        color: colors[index % colors.length],
        value: this.props.options.rewards[index],
        centroid: instance.centroid(arc),
      }
    })
  }

  _getWinnerIndex = () => {
    const deg = Math.abs(Math.round(this.angle % this.oneTurn))
    if (this.angle < 0) {
      return Math.floor(deg / this.angleBySegment)
    }
    return (
      (this.numberOfSegments - Math.floor(deg / this.angleBySegment)) %
      this.numberOfSegments
    )
  }

  _onPress = () => {
    if (this.state.started || this.state.finished) return

    const duration = this.props.options.duration || 10000

    this.setState({ started: true, finished: false })

    Animated.timing(this._angle, {
      toValue:
        365 -
        this.winner! * (this.oneTurn / this.numberOfSegments) +
        360 * (duration / 1000),
      duration: duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      const winnerIndex = this._getWinnerIndex()
      this.setState({
        finished: true,
        winner: this._wheelPaths[winnerIndex].value,
      })

      if (this.props.options.getWinner) {
        this.props.options.getWinner(
          this._wheelPaths[winnerIndex].value,
          winnerIndex,
        )
      }

      this.setState({ started: false })
    })
  }

  _textRender = (x: number, y: number, number: string, i: number) => {
    const emojiMatch = number.match(
      /([\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}])/u,
    )

    let mainText = number
    let additionalText = ''

    if (emojiMatch) {
      const emojiIndex = emojiMatch.index!
      mainText = number.substring(0, emojiIndex).trim()
      additionalText = number.substring(emojiIndex).trim()
    }

    return (
      <G>
        <Text
          x={x}
          y={y - 60}
          fill={this.props.options.textColor || "#fff"}
          textAnchor="middle"
          fontSize={this.props.options.textSize || 16}
          fontFamily={this.props.options.fontFamily || "System"}
          alignmentBaseline="middle"
        >
          {mainText}
        </Text>
        {additionalText && (
          <Text
            x={x}
            y={y}
            fill={this.props.options.textColor || "#fff"}
            textAnchor="middle"
            fontSize={this.props.options.additionalTextSize || 30}
            fontSize={this.props.options.additionalTextSize || 30}
            fontFamily={
              this.props.options.additionalFontFamily ||
              this.props.options.fontFamily ||
              "System"
            } // 👈 separate or fallback
            alignmentBaseline="middle"
          >
            {additionalText}
          </Text>
        )}
      </G>
    );
  }

  _renderSvgWheel = () => {
    return (
      <View style={styles.container}>
        {this._renderKnob()}
        <Animated.View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            transform: [
              {
                rotate: this._angle.interpolate({
                  inputRange: [-this.oneTurn, 0, this.oneTurn],
                  outputRange: [
                    `-${this.oneTurn}deg`,
                    `0deg`,
                    `${this.oneTurn}deg`,
                  ],
                }),
              },
            ],
            backgroundColor: this.props.options.backgroundColor
              ? this.props.options.backgroundColor
              : '#fff',
            width: width - 20,
            height: width - 20,
            borderRadius: (width - 20) / 2,
            borderWidth: this.props.options.borderWidth
              ? this.props.options.borderWidth
              : 2,
            borderColor: this.props.options.borderColor
              ? this.props.options.borderColor
              : '#fff',
            opacity: this.state.wheelOpacity,
          }}
        >
          <AnimatedSvg
            width={this.state.gameScreen}
            height={this.state.gameScreen}
            viewBox={`0 0 ${width} ${width}`}
            style={{
              transform: [{ rotate: `-${this.angleOffset}deg` }],
              margin: 10,
            }}
          >
            <G y={width / 2} x={width / 2}>
              {this._wheelPaths.map((arc, i) => {
                const [x, y] = arc.centroid
                const number = arc.value.toString()

                return (
                  <G key={`arc-${i}`}>
                    <Path d={arc.path} strokeWidth={2} fill={arc.color} />
                    <G
                      rotation={
                        (i * this.oneTurn) / this.numberOfSegments +
                        this.angleOffset
                      }
                      origin={`${x}, ${y}`}
                    >
                      {this._textRender(x, y, number, i)}
                    </G>
                  </G>
                )
              })}
            </G>
          </AnimatedSvg>
        </Animated.View>
      </View>
    )
  }

  _renderKnob = () => {
    const knobSize = this.props.options.knobSize
      ? this.props.options.knobSize
      : 20
    // [0, this.numberOfSegments]
    const YOLO = Animated.modulo(
      Animated.divide(
        Animated.modulo(
          Animated.subtract(this._angle, this.angleOffset),
          this.oneTurn,
        ),
        new Animated.Value(this.angleBySegment),
      ),
      1,
    )

    return (
      <Animated.View
        style={{
          width: knobSize,
          height: knobSize * 2,
          justifyContent: 'flex-end',
          zIndex: 1,
          opacity: this.state.wheelOpacity,
          transform: [
            {
              rotate: YOLO.interpolate({
                inputRange: [-1, -0.5, -0.0001, 0.0001, 0.5, 1],
                outputRange: [
                  '0deg',
                  '0deg',
                  '35deg',
                  '-35deg',
                  '0deg',
                  '0deg',
                ],
              }),
            },
          ],
        }}
      >
        <Svg
          width={knobSize}
          height={(knobSize * 100) / 57}
          viewBox={`0 0 57 100`}
          style={{
            transform: [{ translateY: 8 }],
          }}
        >
          <Image
            source={this.props.options.knobSource}
            style={{ width: knobSize, height: (knobSize * 100) / 57 }}
          />
        </Svg>
      </Animated.View>
    )
  }

  _renderTopToPlay() {
    if (this.state.started == false) {
      return (
        <TouchableOpacity onPress={() => this._onPress()}>
          {this.props.options.playButton()}
        </TouchableOpacity>
      )
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={{
            position: 'absolute',
            width: width,
            height: height / 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Animated.View style={[styles.content, { padding: 10 }]}>
            {this._renderSvgWheel()}
          </Animated.View>
        </TouchableOpacity>
        {this.props.options.playButton ? this._renderTopToPlay() : null}
      </View>
    )
  }
}

export default WheelOfFortune

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {},
  startText: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
})
