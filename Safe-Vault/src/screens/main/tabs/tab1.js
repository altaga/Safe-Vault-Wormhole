import { ethers } from 'ethers';
import React, { Component } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import IconIonicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { abiBatchTokenBalances } from '../../../contracts/batchTokenBalances';
import GlobalStyles, { mainColor } from '../../../styles/styles';
import {
  blockchains,
  refreshRate
} from '../../../utils/constants';
import ContextModule from '../../../utils/contextModule';
import {
  arraySum,
  epsilonRound,
  getAsyncStorageValue,
  setAsyncStorageValue,
} from '../../../utils/utils';

const baseTab1State = {
  refreshing: false,
  nfcSupported: true,
};

class Tab1 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab1State;
    this.controller = new AbortController();
    this.provider = blockchains.map(
      x => new ethers.providers.JsonRpcProvider(x.rpc),
    );
  }
  static contextType = ContextModule;

  async componentDidMount() {
    console.log(this.context.value.publicKey);
    const refreshCheck = Date.now();
    const lastRefresh = await this.getLastRefresh();
    if (refreshCheck - lastRefresh >= refreshRate) {
      // 2.5 minutes
      await setAsyncStorageValue({lastRefresh: Date.now().toString()});
      this.refresh();
    } else {
      console.log(
        `Next refresh Available: ${Math.round(
          (refreshRate - (refreshCheck - lastRefresh)) / 1000,
        )} Seconds`,
      );
    }
  }

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

  async refresh() {
    await this.setStateAsync({refreshing: true});
    await Promise.all([this.getUSD(), this.getBalances()]);
    await this.setStateAsync({refreshing: false});
  }

  // Get Balances

  async getBatchBalances() {
    const {publicKey} = this.context.value;
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
      this.provider.map(
        x => x.getBalance(publicKey) ?? ethers.BigNumber.from(0),
      ),
    );
    const tokenBalances = await Promise.all(
      batchBalancesContracts.map(
        (x, i) =>
          x.batchBalanceOf(publicKey, tokensArrays[i]) ??
          ethers.BigNumber.from(0),
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
    setAsyncStorageValue({balances});
    this.context.setValue({balances});
  }

  // USD Conversions

  async getUSD() {
    const array = blockchains
      .map(x => x.tokens.map(token => token.coingecko))
      .flat();
    var myHeaders = new Headers();
    myHeaders.append('accept', 'application/json');
    var requestOptions = {
      signal: this.controller.signal,
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    };
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${array.toString()}&vs_currencies=usd`,
      requestOptions,
    );
    const result = await response.json();
    const usdConversion = array.map(x => result[x].usd);
    setAsyncStorageValue({usdConversion});
    this.context.setValue({usdConversion});
  }

  async getLastRefresh() {
    try {
      const lastRefresh = await getAsyncStorageValue('lastRefresh');
      if (lastRefresh === null) throw 'Set First Date';
      return lastRefresh;
    } catch (err) {
      await setAsyncStorageValue({lastRefresh: '0'.toString()});
      return 0;
    }
  }

  render() {
    const iconSize = 38;
    return (
      <View
        style={{
          width: '100%',
          height: '100%',
        }}>
        <View style={GlobalStyles.balanceContainer}>
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: 30,
                fontFamily: 'Exo2-Regular',
                color: 'white',
              }}>
              Balance
            </Text>
            <Text
              style={{
                fontSize: 38,
                color: 'white',
                fontFamily: 'Exo2-Regular',
              }}>
              {`$ ${epsilonRound(
                arraySum(
                  this.context.value.balances
                    .flat()
                    .map((x, i) => x * this.context.value.usdConversion[i]),
                ),
                2,
              )} USD`}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'center',
              width: '100%',
            }}>
            <View style={{justifyContent: 'center', alignItems: 'center'}}>
              <Pressable
                onPress={() => this.props.navigation.navigate('SendWallet')}
                style={GlobalStyles.singleButton}>
                <IconIonicons
                  name="arrow-up-outline"
                  size={iconSize}
                  color={'white'}
                />
              </Pressable>
              <Text style={GlobalStyles.singleButtonText}>Send</Text>
            </View>
            <View style={{justifyContent: 'center', alignItems: 'center'}}>
              <Pressable
                onPress={() => this.props.navigation.navigate('DepositWallet')}
                style={GlobalStyles.singleButton}>
                <IconIonicons
                  name="arrow-down-outline"
                  size={iconSize}
                  color={'white'}
                />
              </Pressable>
              <Text style={GlobalStyles.singleButtonText}>Receive</Text>
            </View>
            {this.state.nfcSupported && (
              <View style={{justifyContent: 'center', alignItems: 'center'}}>
                <Pressable
                  onPress={() =>
                    this.props.navigation.navigate('PaymentWallet')
                  }
                  style={GlobalStyles.singleButton}>
                  <IconIonicons name="card" size={iconSize} color={'white'} />
                </Pressable>
                <Text style={GlobalStyles.singleButtonText}>{'Payment'}</Text>
              </View>
            )}
            <View style={{justifyContent: 'center', alignItems: 'center'}}>
              <Pressable
                onPress={() => this.props.navigation.navigate('RedeemWallet')}
                style={GlobalStyles.singleButton}>
                <MaterialIcons name="call-received" size={iconSize} color={'white'} />
              </Pressable>
              <Text style={GlobalStyles.singleButtonText}>Redeem</Text>
            </View>
          </View>
        </View>
        <ScrollView
          refreshControl={
            <RefreshControl
              progressBackgroundColor={mainColor}
              refreshing={this.state.refreshing}
              onRefresh={async () => {
                await setAsyncStorageValue({
                  lastRefresh: Date.now().toString(),
                });
                await this.refresh();
              }}
            />
          }
          
          showsVerticalScrollIndicator={false}
          style={GlobalStyles.tokensContainer}
          contentContainerStyle={{
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}>
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
                        {this.context.value.balances[indexChain][indexToken] ===
                        0
                          ? '0'
                          : this.context.value.balances[indexChain][
                              indexToken
                            ] < 0.01
                          ? '<0.01'
                          : epsilonRound(
                              this.context.value.balances[indexChain][
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
                  <Text style={{color: 'white'}}>
                    $
                    {epsilonRound(
                      this.context.value.balances[indexChain][indexToken] *
                        this.context.value.usdConversion[
                          indexChain * tokens.length + indexToken
                        ],
                      2,
                    )}{' '}
                    USD
                  </Text>
                </View>
              </View>
            )),
          )}
        </ScrollView>
      </View>
    );
  }
}

export default Tab1;
