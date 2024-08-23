import React, {Component} from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  NativeEventEmitter,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import IconIonIcons from 'react-native-vector-icons/Ionicons';
import Renders from '../../assets/logo.png';
import Title from '../../assets/title.png';
import GlobalStyles, {header, mainColor} from '../../styles/styles';
import {blockchain} from '../../utils/constants';
import ContextModule from '../../utils/contextModule';
import Cam from './components/cam';
import KeyboardAwareScrollViewComponent from './components/keyboardAvoid';

function setTokens(array) {
  return array.map((item, index) => {
    return {
      ...item,
      value: index + 1,
      label: item.name,
      key: item.symbol,
    };
  });
}

const SendWalletBaseState = {
  stage: 0,
  loading: false,
  amount: '',
  tokenSelected: setTokens(blockchain.tokens)[0], // 0
  toAddress: '', // ""
};

class SendWallet extends Component {
  constructor(props) {
    super(props);
    this.state = SendWalletBaseState;
    this.EventEmitter = new NativeEventEmitter();
  }

  static contextType = ContextModule;

  async componentDidMount() {
    this.props.navigation.addListener('focus', async () => {
      console.log(this.props.route.name);
      this.EventEmitter.addListener('updateBalances', async () => {
        Keyboard.dismiss();
        this.setState(SendWalletBaseState);
      });
    });
    this.props.navigation.addListener('blur', async () => {
      this.setState(SendWalletBaseState);
    });
  }

  async componentWillUnmount() {
    this.EventEmitter.removeAllListeners('updateBalances');
  }

  // Utils

  async setStateAsync(value) {
    return new Promise(resolve => {
      this.setState(
        {
          ...value,
        },
        () => resolve(),
      );
    });
  }

  render() {
    return (
      <SafeAreaView style={GlobalStyles.container}>
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
        {this.state.stage === 0 && (
          <KeyboardAwareScrollViewComponent>
            <SafeAreaView style={GlobalStyles.mainSend}>
              <ScrollView
                contentContainerStyle={{
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <View
                  style={{
                    alignItems: 'center',
                  }}>
                  <View style={{marginTop: 20}} />
                  <Text style={GlobalStyles.formTitle}>Address</Text>
                  <View
                    style={{
                      width: Dimensions.get('screen').width,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                    <View style={{width: '90%'}}>
                      <TextInput
                        style={[GlobalStyles.input, {fontSize: 12}]}
                        keyboardType="default"
                        value={this.state.toAddress}
                        onChangeText={value => {
                          this.setState({toAddress: value});
                        }}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        this.setStateAsync({
                          stage: 10,
                        });
                      }}
                      style={{width: '10%'}}>
                      <IconIonIcons name="qr-code" size={30} color={'white'} />
                    </Pressable>
                  </View>
                  <Text style={GlobalStyles.formTitle}>Select Token</Text>
                  <RNPickerSelect
                    style={{
                      inputAndroidContainer: {
                        textAlign: 'center',
                      },
                      inputAndroid: {
                        textAlign: 'center',
                        color: 'gray',
                      },
                      viewContainer: {
                        ...GlobalStyles.input,
                        width: Dimensions.get('screen').width * 0.9,
                      },
                    }}
                    value={this.state.tokenSelected.value}
                    items={setTokens(blockchain.tokens).filter(
                      (_, index) => this.context.value.activeTokens[index],
                    )}
                    onValueChange={token => {
                      this.setState({
                        tokenSelected: setTokens(blockchain.tokens)[token - 1],
                      });
                    }}
                  />
                  <Text style={GlobalStyles.formTitle}>Amount</Text>
                  <View
                    style={{
                      width: Dimensions.get('screen').width,
                      flexDirection: 'row',
                      justifyContent: 'space-around',
                      alignItems: 'center',
                    }}>
                    <View style={{width: '100%'}}>
                      <TextInput
                        style={[GlobalStyles.input]}
                        keyboardType="decimal-pad"
                        value={this.state.amount}
                        onChangeText={value => {
                          this.setState({amount: value});
                        }}
                      />
                    </View>
                  </View>
                </View>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: mainColor,
                    width: '90%',
                    marginVertical: 20,
                  }}
                />
                <Pressable
                  disabled={
                    this.state.loading ||
                    this.state.amount === '' ||
                    this.state.toAddress === ''
                  }
                  style={[
                    GlobalStyles.buttonStyle,
                    this.state.loading ||
                    this.state.amount === '' ||
                    this.state.toAddress === ''
                      ? {opacity: 0.5}
                      : {},
                  ]}
                  onPress={() => {
                    this.context.setValue({
                      isTransactionActive: true,
                      transactionData: {
                        walletSelector: 0,
                        command:
                          this.state.tokenSelected.address ===
                          blockchain.tokens[0].address
                            ? 'transfer'
                            : 'transferToken',
                        label: `Transfer ${this.state.tokenSelected.symbol}`,
                        to: this.state.toAddress,
                        amount: this.state.amount,
                        tokenSymbol: this.state.tokenSelected.symbol,
                        maxFlag: false,
                        withSavings: true,
                      },
                    });
                  }}>
                  <Text style={[GlobalStyles.buttonText]}>Execute</Text>
                </Pressable>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAwareScrollViewComponent>
        )}
        {this.state.stage === 10 && (
          <View
            style={[GlobalStyles.mainSend, {justifyContent: 'space-evenly'}]}>
            <View>
              <Text style={{color: 'white', fontSize: 28}}>Scan QR</Text>
            </View>
            <View
              style={{
                height: Dimensions.get('screen').height * 0.5,
                width: Dimensions.get('screen').width * 0.8,
                marginVertical: 20,
                borderColor: mainColor,
                borderWidth: 5,
                borderRadius: 10,
              }}>
              <Cam
                callbackAddress={e => {
                  this.setState({
                    toAddress: e,
                    stage: 0,
                  });
                }}
              />
            </View>
            <Pressable
              style={[GlobalStyles.buttonStyle]}
              onPress={async () => {
                this.setState({
                  stage: 0,
                });
              }}>
              <Text style={{color: 'white', fontSize: 24, fontWeight: 'bold'}}>
                Cancel
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }
}

export default SendWallet;
