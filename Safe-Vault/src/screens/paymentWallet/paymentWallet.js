import { RN_CARD_TRANSACTION, RN_GET_ADDRESS } from '@env';
import { SafeFactory } from '@safe-global/protocol-kit';
import { ethers } from 'ethers';
import React, { Component, Fragment } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNPickerSelect from 'react-native-picker-select';
import RNPrint from 'react-native-print';
import QRCode from 'react-native-qrcode-svg';
import Crypto from 'react-native-quick-crypto';
import VirtualKeyboard from 'react-native-virtual-keyboard';
import checkMark from '../../assets/checkMark.png';
import { logo } from '../../assets/logo';
import Renders from '../../assets/logoHeader.png';
import Title from '../../assets/title.png';
import { abiBatchTokenBalances } from '../../contracts/batchTokenBalances';
import GlobalStyles, {
  footer,
  header,
  main,
  mainColor,
  secondaryColor,
} from '../../styles/styles';
import {
  CloudAccountController,
  CloudPublicKeyEncryption,
  blockchains
} from '../../utils/constants';
import ContextModule from '../../utils/contextModule';
import {
  deleteLeadingZeros,
  epsilonRound,
  findIndexByProperty,
  formatInputText,
} from '../../utils/utils';
import ReadCard from './components/readCard';

function setChains(array) {
  return array.map((item, index) => {
    return {
      ...item,
      value: index + 1,
      label: item.network,
      key: item.network,
    };
  });
}

const BaseStatePaymentWallet = {
  toChainSelector: setChains(blockchains)[0], // 0
  fromChain: 0,
  // Base
  cardAddress: '',
  stage: 0, // 0
  amount: '0.00', // "0.00"
  cardInfo: null,
  loading: false,
  status: 'Processing...',
  explorerURL: '',
  url: '',
  transactionDisplay: {
    name: '',
    amount: 0,
  },
  // QR print
  saveData: '',
};

class PaymentWallet extends Component {
  constructor(props) {
    super(props);
    this.state = BaseStatePaymentWallet;
    this.provider = blockchains.map(
      x => new ethers.providers.JsonRpcProvider(x.rpc),
    );
    this.svg = null;
  }

  async getDataURL() {
    return new Promise(async (resolve, reject) => {
      this.svg.toDataURL(async data => {
        this.setState(
          {
            saveData: data,
          },
          () => resolve('ok'),
        );
      });
    });
  }

  async print() {
    await this.getDataURL();
    const results = await RNHTMLtoPDF.convert({
      html: `
        <div style="text-align: center;">
          <img src='${logo}' width="400px"></img>
          <h1 style="font-size: 3rem;">--------- Original Reciept ---------</h1>
          <h1 style="font-size: 3rem;">Date: ${new Date().toLocaleDateString()}</h1>
          <h1 style="font-size: 3rem;">Type: eth_signTransaction</h1>
          <h1 style="font-size: 3rem;">------------------ • ------------------</h1>
          <h1 style="font-size: 3rem;">Transaction</h1>
          <h1 style="font-size: 3rem;">Amount: ${epsilonRound(
            this.state.transactionDisplay.amount,
            8,
          )} ${this.state.transactionDisplay.name}</h1>
          <h1 style="font-size: 3rem;">------------------ • ------------------</h1>
          <img style="width:70%" src='${
            'data:image/png;base64,' + this.state.saveData
          }'></img>
      </div>
      `,
      fileName: 'print',
      base64: true,
    });
    await RNPrint.print({filePath: results.filePath});
  }

  static contextType = ContextModule;

  componentDidMount() {
    console.log(blockchains.map(x => x.wormholeChainId));
    console.log(this.context.value.publicKeyCard);
    this.props.navigation.addListener('focus', async () => {
      this.setState(BaseStatePaymentWallet);
    });
  }

  encryptCardData(cardData) {
    const encrypted = Crypto.publicEncrypt(
      {
        key: CloudPublicKeyEncryption,
      },
      Buffer.from(cardData, 'utf8'),
    );
    return encrypted.toString('base64');
  }

  async processPayment(hash) {
    await this.provider[this.state.fromChain].waitForTransaction(hash);
    const baseURL =
      this.state.fromChain === this.state.toChainSelector.value - 1
        ? `${blockchains[this.state.fromChain].blockExplorer}tx/`
        : 'https://wormholescan.io/#/tx/';
    await this.setStateAsync({
      explorerURL: `${baseURL}${hash}`,
      status: 'Confirmed',
      loading: false,
    });
  }

  async payFromCard(token) {
    let index = findIndexByProperty(
      blockchains[token.chainIndex].tokens,
      'address',
      token.address,
    );
    if (index === -1) {
      throw new Error('Token not found');
    }
    let usdConversion =
      this.context.value.usdConversion[token.chainIndex * 4 + index];
    await this.setStateAsync({loading: true});
    return new Promise(async (resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');
      const data = await this.encryptCardData(
        `${this.state.cardInfo.card}${this.state.cardInfo.exp}`,
      );
      const raw = JSON.stringify({
        data,
        fromChain: token.chainIndex,
        toChain: this.state.toChainSelector.value - 1,
        amount: epsilonRound(
          parseFloat(deleteLeadingZeros(formatInputText(this.state.amount))) /
            usdConversion,
          token.decimals,
        ).toString(),
        toAddress: this.context.value.publicKey,
        tokenAddress: token.address,
      });
      await this.setStateAsync({
        fromChain: token.chainIndex,
        transactionDisplay: {
          amount: epsilonRound(
            parseFloat(deleteLeadingZeros(formatInputText(this.state.amount))) /
              usdConversion,
            token.decimals,
          ).toString(),
          name: token.symbol,
          icon: token.icon,
        },
      });
      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch(RN_CARD_TRANSACTION, requestOptions)
        .then(response => response.text())
        .then(result => {
          if (result === 'Bad Request') {
            reject('Bad Request');
          } else {
            resolve(result);
          }
        })
        .catch(error => reject(error));
    });
  }

  async getAddressFromCard() {
    return new Promise(async (resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');

      const data = await this.encryptCardData(
        `${this.state.cardInfo.card}${this.state.cardInfo.exp}`,
      );

      const raw = JSON.stringify({
        data,
      });

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch(RN_GET_ADDRESS, requestOptions)
        .then(response => response.text())
        .then(result => {
          if (result === 'Bad Request') {
            reject();
          } else {
            resolve(result);
          }
        })
        .catch(error => reject(error));
    });
  }

  async getBatchBalances() {
    const safeFactory = await Promise.all(
      blockchains.map(x =>
        SafeFactory.init({
          provider: x.rpc,
        }),
      ),
    );
    const safeAccountConfig = {
      owners: [this.state.cardAddress, CloudAccountController],
      threshold: 1,
    };
    const publicKeyCard = await Promise.all(
      blockchains.map((_, i) =>
        safeFactory[i].predictSafeAddress(safeAccountConfig),
      ),
    );
    const tokensArrays = blockchains
      .map(x =>
        x.tokens.filter(
          token =>
            token.address !== '0x0000000000000000000000000000000000000000',
        ),
      )
      .map(x => x.map(y => y.address));
    const batchBalancesContracts = blockchains.map(
      (x, i) =>
        new ethers.Contract(
          x.batchBalancesAddress,
          abiBatchTokenBalances,
          this.provider[i],
        ),
    );
    const nativeBalances = await Promise.all(
      this.provider.map((x, i) => x.getBalance(publicKeyCard[i])),
    );
    const tokenBalances = await Promise.all(
      batchBalancesContracts.map((x, i) =>
        x.batchBalanceOf(publicKeyCard[i], tokensArrays[i]),
      ),
    );
    let balancesMerge = [];
    nativeBalances.forEach((x, i) =>
      balancesMerge.push([x, ...tokenBalances[i]]),
    );
    const balances = blockchains.map((x, i) =>
      x.tokens.map((y, j) => {
        return ethers.utils.formatUnits(balancesMerge[i][j], y.decimals);
      }),
    );
    return balances;
  }

  async getBalances() {
    const balances = await this.getBatchBalances();
    const activeTokens = balances
      .flat()
      .map(
        (tokenBalance, index) =>
          tokenBalance >=
          parseFloat(deleteLeadingZeros(formatInputText(this.state.amount))) /
            this.context.value.usdConversion[index],
      );
    await this.setStateAsync({balances, activeTokens});
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
      <Fragment>
        <SafeAreaView style={[GlobalStyles.container]}>
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
              {
                height: main + footer,
                justifyContent: 'space-around',
                alignItems: 'center',
              },
            ]}>
            {this.state.stage === 0 && (
              <View
                style={{
                  flex: Dimensions.get('window').height - 100,
                  justifyContent: 'space-evenly',
                  alignItems: 'center',
                }}>
                <View>
                  <Text style={[GlobalStyles.formTitle, {alignSelf: 'center'}]}>
                    Select Chain
                  </Text>
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
                    value={this.state.toChainSelector.value}
                    items={setChains(blockchains)}
                    onValueChange={value => {
                      value !== this.state.toChainSelector.value &&
                        this.setState({
                          toChainSelector: setChains(blockchains)[value - 1],
                        });
                    }}
                  />
                </View>
                <Text style={GlobalStyles.title}>Enter Amount (USD)</Text>
                <Text style={{fontSize: 36, color: 'white'}}>
                  {deleteLeadingZeros(formatInputText(this.state.amount))}
                </Text>
                <VirtualKeyboard
                  style={{
                    width: '80vw',
                    fontSize: 40,
                    textAlign: 'center',
                    marginTop: -10,
                  }}
                  cellStyle={{
                    width: 50,
                    height: 50,
                    borderWidth: 1,
                    borderColor: '#77777777',
                    borderRadius: 5,
                    margin: 1,
                  }}
                  color="white"
                  pressMode="string"
                  onPress={amount => this.setState({amount})}
                  decimal
                />
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                    width: Dimensions.get('window').width,
                  }}>
                  <Pressable
                    style={GlobalStyles.buttonStyle}
                    onPress={() => this.setState({stage: 1})}>
                    <Text style={GlobalStyles.buttonText}>Pay with Card</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {this.state.stage === 1 && (
              <React.Fragment>
                <View
                  style={{
                    justifyContent: 'space-evenly',
                    alignItems: 'center',
                  }}>
                  <Text style={GlobalStyles.title}>Amount (USD)</Text>
                  <Text style={{fontSize: 36, color: 'white'}}>
                    $ {deleteLeadingZeros(formatInputText(this.state.amount))}
                  </Text>
                </View>
                <ReadCard
                  cardInfo={async cardInfo => {
                    if (cardInfo) {
                      await this.setStateAsync({cardInfo});
                      try {
                        const cardAddress = await this.getAddressFromCard();
                        await this.setStateAsync({cardAddress});
                        await this.getBalances();
                        await this.setStateAsync({stage: 2});
                      } catch (error) {
                        this.setState({stage: 0});
                      }
                    }
                  }}
                />
              </React.Fragment>
            )}
            {this.state.stage === 2 && (
              <React.Fragment>
                <Text style={[GlobalStyles.title, {marginVertical: 50}]}>
                  Select Payment Token
                </Text>
                <ScrollView>
                  {blockchains
                    .map((blockchain, index) =>
                      blockchain.tokens.map(token => {
                        return {...token, chainIndex: index};
                      }),
                    )
                    .flat()
                    .filter((_, index) => this.state.activeTokens[index])
                    .map((token, index, array) => (
                      <View
                        key={index}
                        style={{
                          paddingBottom: array.length === index + 1 ? 0 : 20,
                          marginBottom: 20,
                          borderBottomWidth: array.length === index + 1 ? 0 : 1,
                          borderColor: mainColor,
                        }}>
                        <Pressable
                          disabled={this.state.loading}
                          style={[
                            GlobalStyles.buttonStyle,
                            this.state.loading ? {opacity: 0.5} : {},
                          ]}
                          onPress={async () => {
                            await this.setStateAsync({loading: true, stage: 3});
                            try {
                              const result = await this.payFromCard(token);
                              this.processPayment(result);
                            } catch (error) {
                              console.log(error);
                            }
                            await this.setStateAsync({loading: false});
                          }}>
                          <Text style={GlobalStyles.buttonText}>
                            {token.symbol}
                            {' ('}
                            {blockchains[token.chainIndex].networkShort}
                            {') '}
                            {token.chainIndex ===
                            this.state.toChainSelector.value - 1
                              ? ''
                              : 'Wormhole'}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                </ScrollView>
              </React.Fragment>
            )}
            {
              // Stage 2
              this.state.stage === 3 && (
                <React.Fragment>
                  <Image
                    source={checkMark}
                    alt="check"
                    style={{width: 200, height: 200}}
                  />
                  <Text
                    style={{
                      textShadowRadius: 1,
                      fontSize: 28,
                      fontWeight: 'bold',
                      color:
                        this.state.status === 'Confirmed'
                          ? secondaryColor
                          : mainColor,
                    }}>
                    {this.state.status}
                  </Text>
                  <View
                    style={[
                      GlobalStyles.networkShow,
                      {
                        width: Dimensions.get('screen').width * 0.9,
                      },
                    ]}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                      }}>
                      <View style={{marginHorizontal: 20}}>
                        <Text style={{fontSize: 20, color: 'white'}}>
                          Transaction
                        </Text>
                        <Text style={{fontSize: 14, color: 'white'}}>
                          Card Payment
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        marginHorizontal: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <View style={{marginHorizontal: 10}}>
                        {this.state.transactionDisplay.icon}
                      </View>
                      <Text style={{color: 'white'}}>
                        {`${epsilonRound(
                          this.state.transactionDisplay.amount,
                          8,
                        )}`}{' '}
                        {this.state.transactionDisplay.name}
                      </Text>
                    </View>
                  </View>
                  <View>
                    <Pressable
                      disabled={this.state.explorerURL === ''}
                      style={[
                        GlobalStyles.buttonStyle,
                        this.state.explorerURL === '' ? {opacity: 0.5} : {},
                      ]}
                      onPress={() => Linking.openURL(this.state.explorerURL)}>
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: 'bold',
                          color: 'white',
                          textAlign: 'center',
                        }}>
                        View on Explorer
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        GlobalStyles.buttonStyle,
                        {
                          backgroundColor: '#cf69ff',
                        },
                        this.state.explorerURL === '' ? {opacity: 0.5} : {},
                      ]}
                      onPress={async () => {
                        this.print();
                      }}
                      disabled={this.state.explorerURL === ''}>
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 24,
                          fontWeight: 'bold',
                        }}>
                        Print Reciept
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        GlobalStyles.buttonStyle,
                        {
                          backgroundColor: '#6978ff',
                        },
                        this.state.explorerURL === '' ? {opacity: 0.5} : {},
                      ]}
                      onPress={async () => {
                        this.setState(BaseStatePaymentWallet);
                      }}
                      disabled={this.state.explorerURL === ''}>
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 24,
                          fontWeight: 'bold',
                        }}>
                        Done
                      </Text>
                    </Pressable>
                  </View>
                </React.Fragment>
              )
            }
          </View>
        </SafeAreaView>
        <View style={{position: 'absolute', bottom: -1000}}>
          <QRCode
            value={
              this.state.explorerURL === ''
                ? 'placeholder'
                : this.state.explorerURL
            }
            size={Dimensions.get('window').width * 0.6}
            ecl="L"
            getRef={c => (this.svg = c)}
          />
        </View>
      </Fragment>
    );
  }
}

export default PaymentWallet;
