import { RN_CREATE_CARD } from '@env';
import { SafeFactory } from '@safe-global/protocol-kit';
import { ethers } from 'ethers';
import React, { Component, Fragment } from 'react';
import {
  Dimensions,
  Keyboard,
  NativeEventEmitter,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import CreditCard from 'react-native-credit-card';
import RNPickerSelect from 'react-native-picker-select';
import Crypto from 'react-native-quick-crypto';
import { abiBatchTokenBalances } from '../../../contracts/batchTokenBalances';
import GlobalStyles, { mainColor } from '../../../styles/styles';
import {
  BatchTokenBalancesAddress,
  CloudAccountController,
  CloudPublicKeyEncryption,
  blockchain,
  refreshRate
} from '../../../utils/constants';
import ContextModule from '../../../utils/contextModule';
import {
  arraySum,
  epsilonRound,
  getAsyncStorageValue,
  randomNumber,
  setAsyncStorageValue,
} from '../../../utils/utils';
import ReadCard from '../components/readCard';

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

const generator = require('creditcard-generator');

const baseTab3State = {
  // Utils
  tokenSelected: setTokens(blockchain.tokens)[0], // 0
  // Card
  cvc: randomNumber(111, 999),
  expiry: '1228',
  name: 'Vault Card',
  number: generator.GenCC('VISA'),
  imageFront: require('../../../assets/cardAssets/card-front.png'),
  imageBack: require('.../../../assets/cardAssets/card-back.png'),
  // Utils
  stage: 0,
  nfcSupported: true,
  loading: false,
  keyboardHeight: 0,
  cardInfo: {
    card: '',
    exp: '',
  },
  // Card Transactions
  amountAdd: '',
  amountRemove: '',
  explorerURL: '',
};

export default class Tab3 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab3State;
    this.provider = new ethers.providers.JsonRpcProvider(blockchain.rpc);
    this.safeFactory;
    this.EventEmitter = new NativeEventEmitter();
  }

  static contextType = ContextModule;

  async getLastRefreshCard() {
    try {
      const lastRefreshCard = await getAsyncStorageValue('lastRefreshCard');
      if (lastRefreshCard === null) throw 'Set First Date';
      return lastRefreshCard;
    } catch (err) {
      await setAsyncStorageValue({lastRefreshCard: 0});
      return 0;
    }
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

  async componentDidMount() {
    this.safeFactory = await SafeFactory.init({
      provider: blockchain.rpc,
    });
    if (this.context.value.publicKeyCard) {
      this.EventEmitter.addListener('updateBalances', async () => {
        await this.refresh();
        await this.setStateAsync({amountAdd: ''});
        Keyboard.dismiss();
      });
      const refreshCheck = Date.now();
      const lastRefresh = await this.getLastRefreshCard();
      if (refreshCheck - lastRefresh >= refreshRate) {
        // 2.5 minutes
        console.log('Refreshing...');
        await setAsyncStorageValue({lastRefreshCard: Date.now()});
        await this.refresh();
      } else {
        console.log(
          `Next refresh Available: ${Math.round(
            (refreshRate - (refreshCheck - lastRefresh)) / 1000,
          )} Seconds`,
        );
      }
    }
  }

  async componentWillUnmount() {
    this.EventEmitter.removeAllListeners('updateBalances');
  }

  async refresh() {
    await this.setStateAsync({refreshing: true});
    await this.getCardBalance();
    await this.setStateAsync({refreshing: false});
  }

  async getBatchBalances() {
    const {publicKeyCard} = this.context.value;
    const [, ...tokensArray] = blockchain.tokens.map(token => token.address);
    const tokenBalances = new ethers.Contract(
      BatchTokenBalancesAddress,
      abiBatchTokenBalances,
      this.provider,
    );
    const [balanceTemp, tempBalances, tempDecimals] = await Promise.all([
      this.provider.getBalance(publicKeyCard),
      tokenBalances.batchBalanceOf(publicKeyCard, tokensArray),
      tokenBalances.batchDecimals(tokensArray),
    ]);
    const balance = parseFloat(ethers.utils.formatEther(balanceTemp));
    const balancesTokens = tempDecimals.map((x, i) =>
      parseFloat(
        ethers.utils
          .formatUnits(tempBalances[i].toString(), tempDecimals[i])
          .toString(),
      ),
    );
    const balances = [balance, ...balancesTokens];
    return balances;
  }

  async getCardBalance() {
    const balancesCard = await this.getBatchBalances();
    await setAsyncStorageValue({balancesCard});
    this.context.setValue({balancesCard});
  }

  async createAccount() {
    const safeAccountConfig = {
      owners: [this.context.value.publicKey, CloudAccountController],
      threshold: 1,
    };
    const pubKey = await this.safeFactory.predictSafeAddress(safeAccountConfig);
    console.log(pubKey);
    return new Promise((resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');
      const raw = JSON.stringify({
        data: this.encryptCardData(
          `${this.state.cardInfo.card}${this.state.cardInfo.exp}`,
        ),
        pubKey,
      });
      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };
      fetch(RN_CREATE_CARD, requestOptions)
        .then(response => response.text())
        .then(result => {
          console.log(result);
          resolve(result);
        })
        .catch(error => reject(error));
    });
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          justifyContent: this.context.value.publicKeyCard
            ? 'flex-start'
            : 'center',
          alignItems: 'center',
          height: this.context.value.publicKeyCard ? 'auto' : '100%',
          width: Dimensions.get('window').width,
          paddingBottom: 10,
        }}>
        {this.context.value.publicKeyCard ? (
          <Fragment>
            <View style={{height: 180, marginVertical: 20}}>
              <CreditCard
                type={this.state.type}
                imageFront={this.state.imageFront}
                imageBack={this.state.imageBack}
                shiny={false}
                bar={false}
                number={this.state.number}
                name={this.state.name}
                expiry={this.state.expiry}
                cvc={this.state.cvc}
              />
            </View>
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                borderBottomWidth: 2,
                borderTopWidth: 2,
                paddingVertical: 15,
                marginBottom: 15,
                borderColor: mainColor,
                width: '90%',
              }}>
              <Text style={[GlobalStyles.exoTitle]}>Card Balance </Text>
              <Text
                style={{
                  fontSize: 38,
                  color: 'white',
                  marginTop: 10,
                }}>
                {`$ ${epsilonRound(
                  arraySum(
                    this.context.value.balancesCard.map(
                      (x, i) => x * this.context.value.usdConversion[i],
                    ),
                  ),
                  2,
                )} USD`}
              </Text>
            </View>
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                borderBottomWidth: 2,
                paddingBottom: 15,
                marginBottom: 15,
                borderColor: mainColor,
                width: '90%',
              }}>
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
                  (_, index) => this.context.value.activeTokensCard[index],
                )}
                onValueChange={token => {
                  this.setState({
                    tokenSelected: setTokens(blockchain.tokens)[token - 1],
                  });
                }}
              />
              <Text style={GlobalStyles.formTitle}>Add Balance</Text>
              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  justifyContent: 'space-evenly',
                  alignItems: 'center',
                }}>
                <TextInput
                  style={[GlobalStyles.input, {width: '60%'}]}
                  keyboardType="decimal-pad"
                  value={this.state.amountAdd}
                  onChangeText={value => this.setState({amountAdd: value})}
                />
                <Pressable
                  disabled={this.state.loading}
                  style={[
                    GlobalStyles.buttonStyle,
                    {
                      width: '35%',
                      padding: 10,
                      marginLeft: '5%',
                    },
                    this.state.loading ? {opacity: 0.5} : {},
                  ]}
                  onPress={async () => {
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
                        to: this.context.value.publicKeyCard,
                        amount: this.state.amountAdd,
                        tokenSymbol: this.state.tokenSelected.symbol,
                        maxFlag: false,
                        withSavings: false,
                      },
                    });
                  }}>
                  <Text style={[GlobalStyles.buttonText, {fontSize: 18}]}>
                    Add
                  </Text>
                </Pressable>
              </View>
            </View>
            {blockchain.tokens.map((token, index) => (
              <View key={index} style={GlobalStyles.network}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                  }}>
                  <View style={{marginHorizontal: 20}}>
                    <View>{token.icon}</View>
                  </View>
                  <View style={{justifyContent: 'center'}}>
                    <Text style={{fontSize: 18, color: 'white'}}>
                      {token.name}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                      }}>
                      <Text style={{fontSize: 12, color: 'white'}}>
                        {this.context.value.balancesCard[index] === 0
                          ? '0'
                          : this.context.value.balancesCard[index] < 0.0001
                          ? '<0.0001'
                          : epsilonRound(
                              this.context.value.balancesCard[index],
                              4,
                            )}{' '}
                        {token.symbol}
                      </Text>
                      <Text style={{fontSize: 12, color: 'white'}}>
                        {`  -  ($${epsilonRound(
                          this.context.value.usdConversion[index],
                          4,
                        )} USD)`}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{marginHorizontal: 20}}>
                  {this.context.value.activeTokensCard[index] ? (
                    <Text style={{color: 'white'}}>
                      $
                      {epsilonRound(
                        this.context.value.balancesCard[index] *
                          this.context.value.usdConversion[index],
                        2,
                      )}{' '}
                      USD
                    </Text>
                  ) : (
                    <Pressable onPress={() => console.log('associate token')}>
                      <Text
                        style={{
                          color: 'white',
                          textAlign: 'center',
                        }}>
                        Associate{'\n'}Token
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </Fragment>
        ) : (
          <Fragment>
            {
              // Stage 0
              this.state.stage === 0 && (
                <Fragment>
                  <Text
                    style={[
                      GlobalStyles.exoTitle,
                      {
                        textAlign: 'center',
                        fontSize: 24,
                        paddingBottom: 20,
                      },
                    ]}>
                    Create Card Account
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      width: '100%',
                    }}>
                    <Pressable
                      disabled={this.state.loading}
                      style={[
                        GlobalStyles.buttonStyle,
                        this.state.loading ? {opacity: 0.5} : {},
                      ]}
                      onPress={async () => {
                        this.setState({stage: 1});
                      }}>
                      <Text style={[GlobalStyles.buttonText]}>
                        {this.state.loading ? 'Creating...' : 'Create Account'}
                      </Text>
                    </Pressable>
                  </View>
                </Fragment>
              )
            }
            {
              // Stage 1
              this.state.stage === 1 && (
                <Fragment>
                  <View
                    style={{
                      justifyContent: 'space-evenly',
                      alignItems: 'center',
                      height: '100%',
                    }}>
                    <Text style={GlobalStyles.title}>
                      {' '}
                      Merge Physical Card to Card Account
                    </Text>
                    <ReadCard
                      cardInfo={async cardInfo => {
                        if (cardInfo) {
                          console.log(cardInfo);
                          await this.setStateAsync({cardInfo});
                          await this.createAccount();
                          const to = await this.safeFactory.getAddress();
                          this.context.setValue({
                            isTransactionActive: true,
                            transactionData: {
                              walletSelector: 0,
                              command: 'createAccount',
                              label: `Create Card`,
                              to,
                              amount: '0.0',
                              tokenSymbol: blockchain.token,
                              maxFlag: false,
                              withSavings: false,
                            },
                          });
                        }
                      }}
                    />
                  </View>
                </Fragment>
              )
            }
          </Fragment>
        )}
      </ScrollView>
    );
  }
}
