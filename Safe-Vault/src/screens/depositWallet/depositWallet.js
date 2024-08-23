import Clipboard from '@react-native-clipboard/clipboard';
import React, {Component} from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import QRCodeStyled from 'react-native-qrcode-styled';
import IconIonicons from 'react-native-vector-icons/Ionicons';
import Renders from '../../assets/logo.png';
import Title from '../../assets/title.png';
import GlobalStyles, {header, ratio} from '../../styles/styles';
import ContextModule from '../../utils/contextModule';
import { blockchain } from '../../utils/constants';

class DepositWallet extends Component {
  constructor(props) {
    super(props);
  }

  static contextType = ContextModule;

  componentDidMount() {
    this.props.navigation.addListener('focus', async () => {
      console.log(this.props.route.name);
    });
  }

  render() {
    return (
      <View style={GlobalStyles.container}>
        <View
          style={[
            GlobalStyles.headerMain,
            {
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignContent: 'center',
            },
          ]}>
          <View style={GlobalStyles.headerItem}>
            <Image
              source={Renders}
              alt="Logo"
              style={{
                width: 192 / 3,
                height: 192 / 3,
                alignSelf: 'flex-start',
                marginLeft: 20,
              }}
            />
          </View>
          <View style={GlobalStyles.headerItem}>
            <Image
              source={Title}
              alt="Logo"
              style={{
                width: 589 * (header / (88 * 2.5)),
                height: 88 * (header / (88 * 2.5)),
              }}
            />
          </View>
        </View>
        <View
          style={[
            GlobalStyles.mainSend,
            {justifyContent: 'space-around', alignItems: 'center'},
          ]}>
          <Text style={GlobalStyles.exoTitle}>Receive {blockchain.token} or ERC20 Tokens</Text>
          <QRCodeStyled
            maxSize={Dimensions.get('screen').width * 0.8}
            data={this.context.value.publicKey}
            style={[
              {
                backgroundColor: 'white',
                borderRadius: 10,
              },
            ]}
            errorCorrectionLevel="H"
            padding={16}
            //pieceSize={9}
            pieceBorderRadius={3}
            isPiecesGlued
            color={'black'}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: ratio > 1.7 ? 24 : 20,
                fontWeight: 'bold',
                color: 'white',
                textAlign: 'center',
                width: '85%',
              }}>
              {this.context.value.publicKey.substring(0, 21) +
                '\n' +
                this.context.value.publicKey.substring(21)}
            </Text>
            <Pressable
              onPress={() => {
                Clipboard.setString(this.context.value.publicKey);
                ToastAndroid.show(
                  'Address copied to clipboard',
                  ToastAndroid.LONG,
                );
              }}
              style={{
                width: '15%',
                alignItems: 'flex-start',
              }}>
              <IconIonicons name="copy" size={30} color={'white'} />
            </Pressable>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              width: '100%',
            }}>
            <Pressable
              style={[GlobalStyles.buttonStyle]}
              onPress={() => this.props.navigation.goBack()}>
              <Text style={[GlobalStyles.buttonText]}>Return</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }
}

export default DepositWallet;
