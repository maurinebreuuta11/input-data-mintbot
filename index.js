import { createAlchemyWeb3 } from '@alch/alchemy-web3';
import schedule from 'node-schedule';

// ******************** 注意修改这块 ********************
const CONTRACT = '0x8960DFF56962D8F9409e44d3Cb15dd1FD3749915';
// mint 价格(eth), 注意要根据自己mint的数量去计算
const PRICE = 0.06;
// 发起交易数
let step = 1;
// 填写钱包信息
const WALLET = {
  address: '0x8ca60cdDA629a5a136Dcc0ab8C85bACA80B79C3f',
  pk: 'a4995b25d116bd7fce55815cdaa8c72aa8ae743a71c30b43ae34868241c433de'
};
// 填写相应的input data, 根据工具生成16进制，注意0x开头 e.g 0x1249c58b
const INPUT_DATA = '0x1249c58b';
const MAX_PRIORITY_FEE_PER_GAS = 200;
const MAX_FEE_PER_GAS = 200;
// 执行间隔 单位（毫秒数）, 这里是1000 也就是1秒mint一次
const DELAY_TIME = 1000;
// 去alchemy 申请的appkey
const ALCHEMY_AK = 's563Cxms3MMOz8vWcFPinmKDl2JPyH0y';

const JOB_DATE = new Date(
  2022, // 年
  4,    // 月 从 0（1月）到 11（12月）
  22,   // 日
  13,    // 时(24小时制)
  55,    // 分
  0);   // 秒

// test测试网， main主网
const currENV = 'test';
// *****************************************************


const RPC_ENV = {
  main: 'wss://eth-mainnet.alchemyapi.io',
  test: 'wss://eth-rinkeby.ws.alchemyapi.io'
};

if (!ALCHEMY_AK) {
  console.log('请设置alchemy ak');
}
const web3 = createAlchemyWeb3(`${RPC_ENV[currENV]}/v2/${ALCHEMY_AK}`);

const estimateGas = (wallet, data, nonce) => {
  if (wallet.address && wallet.pk) {
    const address = wallet.address.toLocaleLowerCase();
    console.log(`♻️ ${address}正在同步当前gas...`);
    web3.eth.estimateGas({
      from: address,
      data: data,
      to: CONTRACT,
      value: web3.utils.toWei(String(PRICE), 'ether'),
    }).then(async (estimatedGas) => {
      const fields = {
        from: address,
        gas: estimatedGas,
        maxPriorityFeePerGas: web3.utils.toHex(web3.utils.toWei(String(MAX_PRIORITY_FEE_PER_GAS), 'gwei')),
        maxFeePerGas: web3.utils.toHex(web3.utils.toWei(String(MAX_FEE_PER_GAS), 'gwei')),
        to: CONTRACT,
        value: web3.utils.toWei(String(PRICE), 'ether'),
        data: web3.utils.toHex(data)
      };
      const signedTx = await signTx(wallet.pk, fields, nonce);
      sendTx(signedTx);
    }).catch(err => {
      console.log('操作异常:', err);
    });
  } else {
    console.log('请检查钱包配置')
    return;
  }
}

const signTx = async (pk, fields = {}, nonce) => {
  console.log('nonce:', nonce);
  const transaction = {
    nonce: nonce,
    ...fields,
  };
  console.log(`✍️ 签名中...`);
  return await web3.eth.accounts.signTransaction(transaction, pk);
}

const sendTx = async (signedTx) => {
  if (!signedTx?.rawTransaction) {
    console.log('❌ 交易异常!');
    return;
  }
  console.log(`📧 发送交易中...`);
  web3.eth.sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
    if (!error) {
      console.log(`✅ 交易发送成功 ${hash}`);
    } else {
      console.log('发生异常', error);
    }
  });
}

// 发起交易
const run = async () => {
  step -= 1;
  const wallet = WALLET;
  estimateGas(wallet, INPUT_DATA, currNonce);
  currNonce += 1;
  console.log('执行send-----');
  if (step <= 0) {
    console.log('定时任务执行完成');
  } else {
    setTimeout(() => run(), DELAY_TIME);
  }
}

let currNonce;
schedule.scheduleJob(JOB_DATE, () => {
  console.log('⏰ 时间到了，开始执行脚本...');
  web3.eth.getTransactionCount(WALLET.address, 'latest').then(nonce => {
    currNonce = nonce;
    console.log('最后一次nonce:', nonce);
    run();
  }).catch(err => {
    console.log('获取nonce异常');
  });
});

console.log('⏰ 时间到了，开始执行脚本...');
web3.eth.getTransactionCount(WALLET.address, 'latest').then(nonce => {
  currNonce = nonce;
  console.log('最后一次nonce:', nonce);
  run();
}).catch(err => {
  console.log('获取nonce异常');
});