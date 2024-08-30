import {RN_CREATE_CARD} from '@env';
import {SafeFactory} from '@safe-global/protocol-kit';
import {ethers} from 'ethers';
import React, {Component, Fragment} from 'react';
import {
  Dimensions,
  Keyboard,
  NativeEventEmitter,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import CreditCard from 'react-native-credit-card';
import RNPickerSelect from 'react-native-picker-select';
import Crypto from 'react-native-quick-crypto';
import {abiBatchTokenBalances} from '../../../contracts/batchTokenBalances';
import GlobalStyles, {mainColor} from '../../../styles/styles';
import {
  CloudPublicKeyEncryption,
  blockchains,
  refreshRate,
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
      key: item.name,
    };
  });
}

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

const generator = require('creditcard-generator');

const baseTab3State = {
  // Creator
  fromChainSelector: setChains(blockchains)[0], // 0
  chainSelector: 0, // 0
  // Utils
  tokenSelected: setTokens(
    blockchains.map(blockchain => blockchain.tokens.map(token => token)).flat(),
  )[0], // 0
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
    this.provider = blockchains.map(
      x => new ethers.providers.JsonRpcProvider(x.rpc),
    );
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
    this.safeFactory = await Promise.all(
      blockchains.map(x =>
        SafeFactory.init({
          provider: x.rpc,
        }),
      ),
    );
    if (this.context.value.publicKeyCard.some(x => x !== '')) {
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
      this.provider.map((x, i) => {
        try {
          if (publicKeyCard[i] === '') return ethers.BigNumber.from(0);
          return x.getBalance(publicKeyCard[i]);
        } catch (err) {
          console.log(`Error in getBalance: ${blockchains[i].network}`);
          console.log(err);
          return ethers.BigNumber.from(0);
        }
      }),
    );
    const tokenBalances = await Promise.all(
      batchBalancesContracts.map((x, i) => {
        try {
          if (publicKeyCard[i] === '')
            return tokensArrays[i].map(() => ethers.BigNumber.from(0));
          return x.batchBalanceOf(publicKeyCard[i], tokensArrays[i]);
        } catch (err) {
          console.log(`Error in batchBalanceOf: ${blockchains[i].network}`);
          console.log(err);
          return ethers.BigNumber.from(0);
        }
      }),
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

  async getCardBalance() {
    const balancesCard = await this.getBatchBalances();
    await setAsyncStorageValue({balancesCard});
    this.context.setValue({balancesCard});
  }

  async createAccount() {
    return new Promise((resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');
      const raw = JSON.stringify({
        data: this.encryptCardData(
          `${this.state.cardInfo.card}${this.state.cardInfo.exp}`,
        ),
        pubKey: this.context.value.publicKey,
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
        refreshControl={
          <RefreshControl
            progressBackgroundColor={mainColor}
            refreshing={this.state.refreshing}
            onRefresh={async () => {
              await setAsyncStorageValue({
                lastRefreshCard: Date.now().toString(),
              });
              await this.refresh();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          justifyContent: this.context.value.publicKeyCard.some(x => x !== '')
            ? 'flex-start'
            : 'center',
          alignItems: 'center',
          height: this.context.value.publicKeyCard.some(x => x !== '')
            ? 'auto'
            : '100%',
          width: Dimensions.get('window').width,
          paddingBottom: 10,
        }}>
        {this.context.value.publicKeyCard.some(x => x !== '') ? (
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
                    this.context.value.balancesCard
                      .flat()
                      .map((x, i) => x * this.context.value.usdConversion[i]),
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
                items={setTokens(
                  blockchains
                    .map(blockchain => blockchain.tokens.map(token => token))
                    .flat(),
                )}
                onValueChange={token => {
                  token !== this.state.tokenSelected.value &&
                    this.setState({
                      chainSelector: Math.floor((token - 1) / 4),
                      tokenSelected: setTokens(
                        blockchains
                          .map(blockchain =>
                            blockchain.tokens.map(token => token),
                          )
                          .flat(),
                      )[token - 1],
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
                  disabled={
                    this.state.loading ||
                    blockchains
                      .map((blockchain, index) =>
                        blockchain.tokens.map(
                          () => this.context.value.publicKeyCard[index] === '',
                        ),
                      )
                      .flat()[this.state.tokenSelected.value - 1]
                  }
                  style={[
                    GlobalStyles.buttonStyle,
                    {
                      width: '35%',
                      padding: 10,
                      marginLeft: '5%',
                    },
                    this.state.loading ||
                    blockchains
                      .map((blockchain, index) =>
                        blockchain.tokens.map(
                          () => this.context.value.publicKeyCard[index] === '',
                        ),
                      )
                      .flat()[this.state.tokenSelected.value - 1]
                      ? {opacity: 0.5}
                      : {},
                  ]}
                  onPress={async () => {
                    this.context.setValue({
                      isTransactionActive: true,
                      transactionData: {
                        vaa: '',
                        walletSelector: 0,
                        fromChainSelector: this.state.chainSelector,
                        toChainSelector: this.state.chainSelector,
                        command:
                          this.state.tokenSelected.address ===
                          blockchains[this.state.chainSelector].tokens[0]
                            .address
                            ? 'transfer'
                            : 'transferToken',
                        label: `Transfer ${this.state.tokenSelected.symbol}`,
                        to: this.context.value.publicKeyCard[
                          this.state.chainSelector
                        ],
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
            {blockchains.map((blockchain, indexChain) =>
              blockchain.tokens.map((token, indexToken, tokens) => (
                <View
                  key={`${indexChain}${indexToken}`}
                  style={GlobalStyles.network}>
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
                          {this.context.value.balancesCard[indexChain][
                            indexToken
                          ] === 0
                            ? '0'
                            : this.context.value.balancesCard[indexChain][
                                indexToken
                              ] < 0.01
                            ? '<0.01'
                            : epsilonRound(
                                this.context.value.balancesCard[indexChain][
                                  indexToken
                                ],
                                2,
                              )}{' '}
                          {token.symbol}
                        </Text>
                        <Text style={{fontSize: 12, color: 'white'}}>
                          {`  -  ($${epsilonRound(
                            this.context.value.usdConversion[
                              indexChain * tokens.length + indexToken
                            ],
                            2,
                          )} USD)`}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{marginHorizontal: 20}}>
                    {this.context.value.publicKeyCard[indexChain] !== '' ? (
                      <Text style={{color: 'white'}}>
                        $
                        {epsilonRound(
                          this.context.value.balancesCard[indexChain][
                            indexToken
                          ] *
                            this.context.value.usdConversion[
                              indexChain * tokens.length + indexToken
                            ],
                          2,
                        )}{' '}
                        USD
                      </Text>
                    ) : (
                      <Pressable
                        onPress={async () => {
                          const to = await this.safeFactory[
                            indexChain
                          ].getAddress();
                          this.context.setValue({
                            isTransactionActive: true,
                            transactionData: {
                              vaa: '',
                              walletSelector: 0,
                              fromChainSelector: indexChain,
                              toChainSelector: 0,
                              command: 'createAccount',
                              label: `Create Card\n${blockchains[indexChain].network} Network`,
                              to,
                              amount: '0.0',
                              tokenSymbol:
                                blockchains[indexChain].tokens[0].symbol,
                              maxFlag: false,
                              withSavings: false,
                            },
                          });
                        }}>
                        <Text style={{color: 'white'}}>Deploy Card</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )),
            )}
          </Fragment>
        ) : (
          <Fragment>
            {
              // Stage 0
              this.state.stage === 0 && (
                <Fragment>
                  <Text style={GlobalStyles.formTitle}>Origin Chain</Text>
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
                    value={this.state.fromChainSelector.value}
                    items={setChains(blockchains)}
                    onValueChange={value => {
                      value !== this.state.fromChainSelector.value &&
                        this.setState({
                          fromChainSelector: setChains(blockchains)[value - 1],
                          tokenSelected: setTokens(
                            blockchains[value - 1].tokens,
                          )[this.state.tokenSelected.value - 1],
                        });
                    }}
                  />
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
                          await this.setStateAsync({cardInfo});
                          await this.createAccount();
                          const to = await this.safeFactory[
                            this.state.fromChainSelector.value - 1
                          ].getAddress();
                          this.context.setValue({
                            isTransactionActive: true,
                            transactionData: {
                              vaa: '',
                              walletSelector: 0,
                              fromChainSelector:
                                this.state.fromChainSelector.value - 1,
                              toChainSelector: 0,
                              command: 'createAccount',
                              label: `Create Card\n${
                                blockchains[
                                  this.state.fromChainSelector.value - 1
                                ].network
                              } Network`,
                              to,
                              amount: '0.0',
                              tokenSymbol:
                                blockchains[
                                  this.state.fromChainSelector.value - 1
                                ].token,
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
