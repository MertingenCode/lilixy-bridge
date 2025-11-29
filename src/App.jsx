import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, ChevronDown, Wallet, Loader2, Info, Zap, ShieldCheck, ArrowLeftRight, Settings, Search, History, X, ExternalLink, RefreshCw, CheckCircle2, XCircle, Clock, Moon, Sun, UserPlus, AlertTriangle } from 'lucide-react';

// --- Helper Functions & API ---

const LIFI_API_URL = 'https://li.quest/v1';

// Popular chains to prioritize
const POPULAR_CHAINS = [1, 137, 42161, 10, 8453, 56, 43114];

const formatAddress = (addr) => {
  if (!addr) return '';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

const formatAmount = (num) => {
  if (!num) return '0.00';
  return parseFloat(num).toLocaleString('en-US', { maximumFractionDigits: 6 });
};

const formatUSD = (amount, price) => {
    if (!amount || !price || isNaN(amount) || isNaN(price)) return null;
    const total = parseFloat(amount) * parseFloat(price);
    if (total === 0) return '$0.00';
    if (total < 0.01) return '<$0.01';
    return total.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const getFontSize = (str) => {
  if (!str) return 'text-4xl';
  const len = str.toString().length;
  if (len > 20) return 'text-lg';
  if (len > 14) return 'text-2xl';
  if (len > 10) return 'text-3xl';
  return 'text-4xl';
};

// --- Translations ---
const TRANSLATIONS = {
    en: {
        connect: 'Connect Wallet',
        pay: 'You pay',
        receive: 'You receive',
        bridge: 'Bridge',
        history: 'History',
        select: 'Select',
        selectChain: 'Select Chain',
        selectToken: 'Select Token',
        searchChain: 'Search chain...',
        searchToken: 'Name, symbol or address...',
        noRoute: 'No Route',
        confirm: 'Confirm Transaction',
        networkFee: 'Network Fee',
        provider: 'Provider',
        clearHistory: 'Clear History',
        noHistory: 'No transaction history yet.',
        success: 'Transaction Successful!',
        sendTo: 'Send to another wallet',
        recipientAddr: 'Recipient Address',
        found: 'FOUND',
        balance: 'Bal',
        max: 'MAX',
        disclaimer: 'We do not hold custody of funds. Use at your own risk. Bridge fees and slippage may vary based on network conditions.',
        rights: 'All rights reserved.',
        txRejected: 'Transaction rejected by user',
        error: 'Error'
    },
    tr: {
        connect: 'Cüzdan Bağla',
        pay: 'Ödediğiniz',
        receive: 'Aldığınız',
        bridge: 'Köprü',
        history: 'Geçmiş',
        select: 'Seç',
        selectChain: 'Ağ Seç',
        selectToken: 'Token Seç',
        searchChain: 'Ağ ara...',
        searchToken: 'İsim, sembol veya adres...',
        noRoute: 'Rota Yok',
        confirm: 'İşlemi Onayla',
        networkFee: 'Ağ Ücreti',
        provider: 'Sağlayıcı',
        clearHistory: 'Geçmişi Temizle',
        noHistory: 'Henüz işlem geçmişi yok.',
        success: 'İşlem Başarılı!',
        sendTo: 'Başka cüzdana gönder',
        recipientAddr: 'Alıcı Adresi',
        found: 'BULUNDU',
        balance: 'Bak',
        max: 'MAKS',
        disclaimer: 'Fonların velayetini tutmuyoruz. Risk size aittir. Köprü ücretleri ve kayma oranları ağ koşullarına göre değişebilir.',
        rights: 'Tüm hakları saklıdır.',
        txRejected: 'İşlem kullanıcı tarafından reddedildi',
        error: 'Hata'
    },
    es: {
        connect: 'Conectar Billetera',
        pay: 'Tú pagas',
        receive: 'Tú recibes',
        bridge: 'Puente',
        history: 'Historial',
        select: 'Seleccionar',
        selectChain: 'Seleccionar Red',
        selectToken: 'Seleccionar Token',
        searchChain: 'Buscar red...',
        searchToken: 'Nombre, símbolo o dirección...',
        noRoute: 'Sin Ruta',
        confirm: 'Confirmar Transacción',
        networkFee: 'Tarifa de Red',
        provider: 'Proveedor',
        clearHistory: 'Borrar Historial',
        noHistory: 'No hay historial aún.',
        success: '¡Transacción Exitosa!',
        sendTo: 'Enviar a otra billetera',
        recipientAddr: 'Dirección del Destinatario',
        found: 'ENCONTRADO',
        balance: 'Bal',
        max: 'MÁX',
        disclaimer: 'No custodiamos fondos. Úselo bajo su propio riesgo. Las tarifas pueden variar.',
        rights: 'Todos los derechos reservados.',
        txRejected: 'Transacción rechazada por el usuario',
        error: 'Error'
    },
    fr: {
        connect: 'Connecter Portefeuille',
        pay: 'Vous payez',
        receive: 'Vous recevez',
        bridge: 'Pont',
        history: 'Historique',
        select: 'Choisir',
        selectChain: 'Choisir Réseau',
        selectToken: 'Choisir Jeton',
        searchChain: 'Chercher réseau...',
        searchToken: 'Nom, symbole ou adresse...',
        noRoute: 'Aucune Route',
        confirm: 'Confirmer',
        networkFee: 'Frais Réseau',
        provider: 'Fournisseur',
        clearHistory: 'Effacer',
        noHistory: 'Aucun historique.',
        success: 'Transaction Réussie!',
        sendTo: 'Envoyer à une autre adresse',
        recipientAddr: 'Adresse Destinataire',
        found: 'TROUVÉ',
        balance: 'Solde',
        max: 'MAX',
        disclaimer: 'Nous ne détenons pas les fonds. À vos risques. Les frais peuvent varier.',
        rights: 'Tous droits réservés.',
        txRejected: 'Transaction rejetée par l\'utilisateur',
        error: 'Erreur'
    },
    zh: {
        connect: '连接钱包',
        pay: '支付',
        receive: '收到',
        bridge: '跨链桥',
        history: '历史记录',
        select: '选择',
        selectChain: '选择网络',
        selectToken: '选择代币',
        searchChain: '搜索网络...',
        searchToken: '名称, 符号 或 地址...',
        noRoute: '无路线',
        confirm: '确认交易',
        networkFee: '网络费用',
        provider: '提供商',
        clearHistory: '清除历史',
        noHistory: '暂无交易记录',
        success: '交易成功!',
        sendTo: '发送到其他钱包',
        recipientAddr: '接收地址',
        found: '已找到',
        balance: '余额',
        max: '最大',
        disclaimer: '我们要不持有资金。风险自负。费用可能因网络状况而异。',
        rights: '版权所有.',
        txRejected: '用户拒绝了交易',
        error: '错误'
    },
    ja: {
        connect: 'ウォレット接続',
        pay: '支払い',
        receive: '受け取り',
        bridge: 'ブリッジ',
        history: '履歴',
        select: '選択',
        selectChain: 'チェーン選択',
        selectToken: 'トークン選択',
        searchChain: 'チェーン検索...',
        searchToken: '名前, シンボル または アドレス...',
        noRoute: 'ルートなし',
        confirm: '取引確認',
        networkFee: 'ネットワーク手数料',
        provider: 'プロバイダー',
        clearHistory: '履歴消去',
        noHistory: '取引履歴はありません。',
        success: '取引成功!',
        sendTo: '別のウォレットへ送信',
        recipientAddr: '受取人アドレス',
        found: '見つかりました',
        balance: '残高',
        max: '最大',
        disclaimer: '資金は保管しません。自己責任で使用してください。手数料は変動する可能性があります。',
        rights: '全著作権所有.',
        txRejected: 'ユーザーが取引を拒否しました',
        error: 'エラー'
    }
};

// --- Static Card Component ---
const StaticCard = ({ children, className }) => {
  return (
    <div className={`transition-all duration-300 ease-out ${className}`}>
      {children}
    </div>
  );
};

export default function LifiBridgeApp() {
  // --- State Management ---
  const [chains, setChains] = useState([]);
  const [tokens, setTokens] = useState({ from: [], to: [] });
  // NEW: Dedicated state for balances { [tokenAddress]: amount }
  const [tokenBalances, setTokenBalances] = useState({});
  const [loading, setLoading] = useState({ chains: true, tokens: false, quote: false, swap: false, history: false });
  
  const [wallet, setWallet] = useState({ address: null, chainId: null, connected: false });
  
  const [fromChain, setFromChain] = useState(null);
  const [toChain, setToChain] = useState(null);
  const [fromToken, setFromToken] = useState(null);
  const [toToken, setToToken] = useState(null);
  const [amount, setAmount] = useState('');
  
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState({ type: null, side: null });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tab Management: 'bridge' or 'history'
  const [activeTab, setActiveTab] = useState('bridge');

  // Custom Token Search States
  const [importedToken, setImportedToken] = useState(null);
  const [isSearchingToken, setIsSearchingToken] = useState(false);

  // Transaction History State
  const [txHistory, setTxHistory] = useState([]);

  // New Features States
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('light');
  const [isRecipientMode, setIsRecipientMode] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientHistory, setRecipientHistory] = useState([]);
  
  // Language Menu State
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  // Ref to prevent overwriting tokens during swap
  const isSwapping = useRef(false);

  // --- Init Loading (Settings & History) ---
  useEffect(() => {
      const savedHistory = localStorage.getItem('lilixy_tx_history');
      if (savedHistory) setTxHistory(JSON.parse(savedHistory));

      const savedLang = localStorage.getItem('lilixy_lang');
      if (savedLang) setLanguage(savedLang);

      const savedTheme = localStorage.getItem('lilixy_theme');
      if (savedTheme) setTheme(savedTheme);

      const savedRecipients = localStorage.getItem('lilixy_recipients');
      if (savedRecipients) setRecipientHistory(JSON.parse(savedRecipients));
  }, []);

  // Toast Helper
  const showToast = (message, type = 'info') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };

  // Save Settings Handlers
  const changeLanguage = (lang) => {
      setLanguage(lang);
      localStorage.setItem('lilixy_lang', lang);
      setLangMenuOpen(false);
  };

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('lilixy_theme', newTheme);
  };

  // Helper for Translation
  const t = (key) => TRANSLATIONS[language][key] || TRANSLATIONS['en'][key];

  // --- History & Recipient Logic ---
  const addToHistory = (txHash, fromDetails, toDetails, amountVal) => {
      const newTx = {
          hash: txHash,
          timestamp: Date.now(),
          fromChain: fromDetails.chain,
          toChain: toDetails.chain,
          fromToken: fromDetails.token,
          toToken: toDetails.token,
          amount: amountVal,
          status: 'PENDING'
      };
      const updatedHistory = [newTx, ...txHistory];
      setTxHistory(updatedHistory);
      localStorage.setItem('lilixy_tx_history', JSON.stringify(updatedHistory));
  };

  const saveRecipient = (addr) => {
      if (!addr || recipientHistory.includes(addr)) return;
      const updated = [addr, ...recipientHistory].slice(0, 5); // Keep last 5
      setRecipientHistory(updated);
      localStorage.setItem('lilixy_recipients', JSON.stringify(updated));
  };

  // --- LI.FI Status Polling ---
  const updateHistoryStatus = async () => {
      if (txHistory.length === 0) return;
      setLoading(prev => ({ ...prev, history: true }));
      const updatedHistory = await Promise.all(txHistory.map(async (tx) => {
          if (tx.status === 'DONE' || tx.status === 'FAILED') return tx;
          try {
              const response = await fetch(`${LIFI_API_URL}/status?txHash=${tx.hash}&fromChain=${tx.fromChain.id}&toChain=${tx.toChain.id}`);
              const data = await response.json();
              if (data.status) return { ...tx, status: data.status };
              return tx;
          } catch (e) { return tx; }
      }));
      setTxHistory(updatedHistory);
      localStorage.setItem('lilixy_tx_history', JSON.stringify(updatedHistory));
      setLoading(prev => ({ ...prev, history: false }));
  };

  useEffect(() => {
      if (activeTab === 'history') {
          updateHistoryStatus();
          const interval = setInterval(updateHistoryStatus, 15000);
          return () => clearInterval(interval);
      }
  }, [activeTab]);

  // --- API Requests ---

  // 1. Fetch Chains
  useEffect(() => {
    const fetchChains = async () => {
      try {
        const res = await fetch(`${LIFI_API_URL}/chains`);
        const data = await res.json();
        const supportedChains = data.chains.filter(c => c.mainnet === true);
        supportedChains.sort((a, b) => {
            const indexA = POPULAR_CHAINS.indexOf(a.id);
            const indexB = POPULAR_CHAINS.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return 0;
        });
        setChains(supportedChains);
        setFromChain(supportedChains.find(c => c.id === 1) || supportedChains[0]);
        setToChain(supportedChains.find(c => c.id === 137) || supportedChains[1]);
        setLoading(prev => ({ ...prev, chains: false }));
      } catch (err) {
        console.error(err);
        showToast("Connection error", 'error');
      }
    };
    fetchChains();
  }, []);

  // 2. Fetch Tokens (Base List) - No balance here initially
  const fetchTokens = useCallback(async (chainId, side) => {
    if (!chainId) return;
    setLoading(prev => ({ ...prev, tokens: true }));
    try {
      const res = await fetch(`${LIFI_API_URL}/tokens?chains=${chainId}`);
      const data = await res.json();
      let chainTokens = data.tokens[chainId] || [];
      
      // If wallet is connected, we will fetch balances separately/later or bulk if API allows
      // But user reported bulk fetch isn't working well for balances.
      // So we rely on `fetchSpecificBalance` to update the active token.

      const defaultToken = chainTokens.find(t => t.symbol === 'USDC' || t.symbol === 'ETH' || t.symbol === 'USDT') || chainTokens[0];

      setTokens(prev => ({ ...prev, [side]: chainTokens }));
      
      if (!isSwapping.current) {
          if (side === 'from') setFromToken(prev => prev || defaultToken);
          if (side === 'to') setToToken(prev => prev || defaultToken);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, tokens: false }));
    }
  }, []);

  useEffect(() => {
    if (isSwapping.current) return;
    if (fromChain) fetchTokens(fromChain.id, 'from');
  }, [fromChain, fetchTokens]);

  useEffect(() => {
    if (isSwapping.current) return;
    if (toChain) fetchTokens(toChain.id, 'to');
  }, [toChain, fetchTokens]);

  // --- DEDICATED BALANCE FETCHING ---
  // When active token, chain or wallet changes, fetch ONLY that token's balance
  useEffect(() => {
    const fetchSpecificBalance = async () => {
        if (!wallet.connected || !wallet.address || !fromChain || !fromToken) return;
        
        try {
            // Using /token endpoint which is specific for one token balance
            const url = `${LIFI_API_URL}/token?chain=${fromChain.id}&token=${fromToken.address}&wallet=${wallet.address}`;
            const res = await fetch(url);
            const data = await res.json();
            
            // If we got a valid amount, update our dedicated balance store
            if (data && (data.amount || data.amount === '0' || data.amount === 0)) {
                 setTokenBalances(prev => ({
                     ...prev,
                     [fromToken.address.toLowerCase()]: data.amount
                 }));
            }
        } catch (e) {
            console.error("Balance fetch error", e);
        }
    };

    fetchSpecificBalance();
    // Re-fetch every 15s to keep balance fresh
    const i = setInterval(fetchSpecificBalance, 15000);
    return () => clearInterval(i);
  }, [wallet.address, fromChain?.id, fromToken?.address, wallet.connected]);


  // Quote
  useEffect(() => {
    const getQuote = async () => {
      if (!amount || parseFloat(amount) <= 0 || !fromChain || !toChain || !fromToken || !toToken) {
        setQuote(null);
        return;
      }
      
      const targetAddress = isRecipientMode && recipientAddress ? recipientAddress : (wallet.address || '0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0');

      setLoading(prev => ({ ...prev, quote: true }));
      setError(null);
      setQuote(null);

      try {
        const amountRaw = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toLocaleString('fullwide', { useGrouping: false }).split('.')[0];
        
        const params = new URLSearchParams({
            fromChain: fromChain.id,
            toChain: toChain.id,
            fromToken: fromToken.address,
            toToken: toToken.address,
            fromAmount: amountRaw,
            fromAddress: wallet.address || targetAddress, 
            toAddress: targetAddress,
            integrator: 'lilixy',
            fee: '0.0025',
        });

        const res = await fetch(`${LIFI_API_URL}/quote?${params}`);
        const data = await res.json();

        if (data.message) throw new Error(data.message);
        setQuote(data);
      } catch (err) {
        // Only show error in UI, not toast for quoting
        console.error(err);
        setError(t('noRoute'));
      } finally {
        setLoading(prev => ({ ...prev, quote: false }));
      }
    };

    const timer = setTimeout(() => getQuote(), 600);
    return () => clearTimeout(timer);
  }, [amount, fromChain, toChain, fromToken, toToken, wallet.address, isRecipientMode, recipientAddress]);


  // Wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setWallet({ address: accounts[0], chainId: parseInt(chainId, 16), connected: true });

        window.ethereum.on('chainChanged', (c) => setWallet(prev => ({ ...prev, chainId: parseInt(c, 16) })));
        window.ethereum.on('accountsChanged', (a) => {
            if (a.length === 0) setWallet({ address: null, chainId: null, connected: false });
            else setWallet(prev => ({ ...prev, address: a[0] }));
        });
      } catch (error) { 
          console.error(error); 
          showToast(t('error'), 'error');
      }
    } else { showToast("Wallet not found!", 'error'); }
  };

  const handleSwap = async () => {
    if (!wallet.connected) return connectWallet();
    if (!quote) return;

    setLoading(prev => ({ ...prev, swap: true }));
    try {
        if (wallet.chainId !== fromChain.id) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${fromChain.id.toString(16)}` }],
            });
        }
        const txParams = {
            from: wallet.address,
            to: quote.transactionRequest.to,
            data: quote.transactionRequest.data,
            value: quote.transactionRequest.value,
        };
        const txHash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [txParams] });
        
        addToHistory(txHash, { chain: fromChain, token: fromToken }, { chain: toChain, token: toToken }, amount);
        
        if (isRecipientMode && recipientAddress) {
            saveRecipient(recipientAddress);
        }

        setActiveTab('history');
        showToast(t('success'), 'success');
    } catch (err) {
        // Detect User Rejection
        if (err.code === 4001 || err.message.includes('rejected')) {
            showToast(t('txRejected'), 'error');
        } else {
            showToast(err.message || t('error'), 'error');
        }
    } finally {
        setLoading(prev => ({ ...prev, swap: false }));
    }
  };

  const handleReverse = () => {
    if (isSwapping.current) return;
    isSwapping.current = true;

    const prevFromChain = fromChain;
    const prevToChain = toChain;
    const prevFromToken = fromToken;
    const prevToToken = toToken;
    const prevFromTokensList = tokens.from;
    const prevToTokensList = tokens.to;

    let newAmount = amount;
    if (quote && quote.estimate) {
         const rawAmount = parseFloat(quote.estimate.toAmount);
         const decimals = toToken ? toToken.decimals : 18;
         const calculated = rawAmount / Math.pow(10, decimals);
         newAmount = parseFloat(calculated.toFixed(6)).toString(); 
    }

    setFromChain(prevToChain);
    setToChain(prevFromChain);
    setFromToken(prevToToken);
    setToToken(prevFromToken);
    setAmount(newAmount);
    setTokens({ from: prevToTokensList, to: prevFromTokensList });
    setQuote(null);

    setTimeout(() => { isSwapping.current = false; }, 800);
  };

  const handlePercentageClick = (percent) => {
      // Look up balance from dedicated state or active token
      const tokenAddr = fromToken?.address?.toLowerCase();
      // Try dedicated map first, then fallback
      const rawAmount = tokenBalances[tokenAddr];

      if (rawAmount) {
          const bal = parseFloat(rawAmount) / Math.pow(10, fromToken.decimals);
          if (bal > 0) {
              const newAmount = (bal * percent).toFixed(6); 
              setAmount(parseFloat(newAmount).toString());
          }
      }
  };

  // --- Render Helpers ---
  const getStatusBadge = (status) => {
      switch (status) {
          case 'DONE': return <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full"><CheckCircle2 size={12} /> DONE</span>;
          case 'FAILED': return <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full"><XCircle size={12} /> FAILED</span>;
          default: return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full"><Clock size={12} className="animate-spin" /> PENDING</span>;
      }
  };

  // Format Balance Helper
  const getBalanceForToken = (token) => {
      if (!token || !token.address) return '0';
      // Prioritize the dedicated balance state
      const bal = tokenBalances[token.address.toLowerCase()];
      if (!bal || parseFloat(bal) === 0) return '0';
      
      const val = parseFloat(bal) / Math.pow(10, token.decimals);
      if (val < 0.00001) return '<0.00001';
      return val.toLocaleString('en-US', { maximumFractionDigits: 5 });
  };

  // Colors based on Theme
  const isDark = theme === 'dark';
  const bgApp = isDark ? 'bg-slate-950' : 'bg-white';
  const textMain = isDark ? 'text-white' : 'text-gray-800';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-slate-900/70 border-slate-800 ring-white/10' : 'bg-white/70 border-white/50 ring-white/60';
  const innerCardBg = isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-transparent';
  const inputColor = isDark ? 'text-white placeholder-gray-600' : 'text-gray-800 placeholder-gray-200';
  const modalBg = isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-blue-100';
  const modalItemHover = isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50';

  // --- Modal ---
  const renderModal = () => {
    if (!['chain', 'token'].includes(modalOpen.type)) return null;
    const isChain = modalOpen.type === 'chain';
    let list = isChain ? chains : tokens[modalOpen.side];
    
    let filteredList = list.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.address && item.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!isChain && importedToken && !filteredList.find(t => t.address.toLowerCase() === importedToken.address.toLowerCase())) {
        filteredList = [importedToken, ...filteredList];
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`${modalBg} backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl overflow-hidden border ring-4 ring-blue-500/10`}>
                <div className={`p-5 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'} flex justify-between items-center`}>
                    <h3 className={`font-bold text-lg tracking-tight ${textMain}`}>
                        {isChain ? t('selectChain') : t('selectToken')}
                    </h3>
                    <button onClick={() => { setModalOpen({ type: null }); setImportedToken(null); }} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        <X size={18} />
                    </button>
                </div>
                <div className={`p-4 relative ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                    <div className="relative">
                         <input 
                            type="text" 
                            placeholder={isChain ? t('searchChain') : t('searchToken')}
                            className={`w-full border rounded-2xl pl-10 pr-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        <div className="absolute left-3 top-3.5 text-gray-400">
                            {isSearchingToken ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </div>
                    </div>
                </div>
                <div className={`overflow-y-auto flex-1 p-2 space-y-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                    {filteredList.map((item) => {
                        const balance = !isChain ? getBalanceForToken(item) : null;
                        return (
                        <button
                            key={item.id || item.address}
                            onClick={() => {
                                if (isChain) {
                                    if (modalOpen.side === 'from') setFromChain(item);
                                    else setToChain(item);
                                } else {
                                    if (modalOpen.side === 'from') setFromToken(item);
                                    else setToToken(item);
                                    
                                    if (modalOpen.side === 'from' && balance !== '0') {
                                        handlePercentageClick(1);
                                    }
                                }
                                setModalOpen({ type: null });
                                setSearchQuery('');
                                setImportedToken(null);
                            }}
                            className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all group text-left border border-transparent ${modalItemHover} ${importedToken && item.address === importedToken.address ? 'bg-blue-50/50 border-blue-100' : ''}`}
                        >
                            <img 
                                src={item.logoURI || 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/default_token.png'} 
                                onError={(e) => { e.target.src = 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/default_token.png' }}
                                alt={item.name} 
                                className={`w-10 h-10 rounded-full object-cover p-0.5 ${isDark ? 'bg-transparent' : 'bg-white shadow-sm'}`}
                            />
                            <div className="min-w-0 flex-1 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className={`font-bold transition-colors truncate ${textMain} group-hover:text-blue-500`}>{item.name}</div>
                                        {importedToken && item.address === importedToken.address && (
                                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">{t('found')}</span>
                                        )}
                                    </div>
                                    { !isChain && (
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-xs font-medium ${textSub}`}>{item.symbol}</span>
                                            {item.address && (
                                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md truncate max-w-[100px] ${isDark ? 'bg-slate-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                                    {formatAddress(item.address)}
                                                </span>
                                            )}
                                        </div>
                                    ) }
                                </div>
                                {/* BALANCE DISPLAY IN LIST */}
                                {!isChain && balance !== '0' && (
                                    <div className="text-right">
                                        <div className={`text-xs font-bold ${textMain}`}>{balance}</div>
                                        <div className="text-[10px] text-gray-400">{t('balance')}</div>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                    })}
                    {filteredList.length === 0 && !isSearchingToken && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            {isChain ? "Chain not found" : "Token or Address not found"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  const activeTokenBalance = getBalanceForToken(fromToken);

  return (
    <div className={`min-h-screen ${bgApp} ${textMain} font-sans relative overflow-hidden selection:bg-blue-200 selection:text-blue-900 flex flex-col transition-colors duration-500`}>
      
      {/* --- Dynamic Background Effects --- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[120px] animate-pulse ${isDark ? 'bg-blue-900/20' : 'bg-blue-400/20'}`} style={{ animationDuration: '4s' }} />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[120px] animate-pulse ${isDark ? 'bg-indigo-900/20' : 'bg-cyan-400/20'}`} style={{ animationDuration: '6s' }} />
        <div className={`absolute top-[20%] right-[20%] w-[400px] h-[400px] rounded-full blur-[80px] ${isDark ? 'bg-purple-900/10' : 'bg-indigo-300/20'}`} />
      </div>

      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-2 fade-in duration-300">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border ${toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white border-gray-100 text-gray-800'}`}>
                  {toast.type === 'error' ? <AlertTriangle size={20} /> : <Info size={20} className="text-blue-500" />}
                  <span className="font-medium text-sm">{toast.message}</span>
                  <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={16}/></button>
              </div>
          </div>
      )}

      {/* --- Header --- */}
      <header className="relative z-10 w-full px-6 py-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="text-3xl font-black tracking-tight pr-4 pb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 leading-normal">
            Lilixy Bridge
        </div>

        <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className={`p-3 rounded-full transition-all duration-500 transform hover:rotate-[360deg] active:scale-90 ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-orange-500 hover:bg-orange-50 shadow-sm border border-gray-100'}`}
                title={t('theme')}
            >
                {isDark ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Language Selector */}
            <div className={`flex items-center rounded-full transition-all duration-500 ease-in-out overflow-hidden ${langMenuOpen ? 'w-56' : 'w-12'} ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
                <button
                    onClick={() => setLangMenuOpen(!langMenuOpen)}
                    className={`w-12 h-10 flex-shrink-0 flex items-center justify-center font-bold text-xs ${isDark ? 'text-white' : 'text-gray-700'}`}
                >
                    {language.toUpperCase()}
                </button>
                
                {/* Expanded Options */}
                <div className="flex items-center gap-1 pr-3 overflow-hidden">
                     {['en', 'tr', 'es', 'fr', 'zh', 'ja'].filter(l => l !== language).map(lang => (
                         <button
                            key={lang}
                            onClick={() => changeLanguage(lang)}
                            className={`px-2 py-1 text-xs font-medium rounded hover:scale-110 transition-transform whitespace-nowrap ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-blue-600'}`}
                         >
                            {lang.toUpperCase()}
                         </button>
                     ))}
                </div>
            </div>

            <button 
                onClick={connectWallet}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg 
                ${wallet.connected 
                    ? (isDark ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-white text-blue-600 border border-blue-100') 
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-blue-400/50'
                }`}
            >
                <Wallet size={18} className={wallet.connected ? "text-blue-500" : "text-white"} />
                {wallet.connected ? formatAddress(wallet.address) : t('connect')}
            </button>
        </div>
      </header>

      {/* --- Main Stage --- */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-grow px-4 pb-8">
        
        <StaticCard className="w-full max-w-[500px]">
            <div className={`${cardBg} backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-2 relative overflow-hidden ring-1 min-h-[500px] h-auto transition-[height] duration-500 ease-in-out flex flex-col`}>
                
                {/* Inner Glow Effect */}
                <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br via-transparent to-transparent pointer-events-none rounded-[3rem] ${isDark ? 'from-white/5' : 'from-white/40'}`} />

                <div className="p-6 md:p-8 relative z-10 flex flex-col h-full">

                    {/* --- Tab Switcher --- */}
                    <div className="flex justify-center mb-4 shrink-0">
                        <div className={`p-1.5 rounded-full flex gap-1 ${isDark ? 'bg-slate-800' : 'bg-gray-100/80'}`}>
                            <button
                                onClick={() => setActiveTab('bridge')}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                                    activeTab === 'bridge' 
                                    ? (isDark ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-blue-600 shadow-md') 
                                    : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                                }`}
                            >
                                {t('bridge')}
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                                    activeTab === 'history' 
                                    ? (isDark ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-blue-600 shadow-md') 
                                    : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                                }`}
                            >
                                {t('history')}
                            </button>
                        </div>
                    </div>

                    {/* --- CONTENT: BRIDGE --- */}
                    {activeTab === 'bridge' && (
                        <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full">
                             {/* FROM CARD */}
                            <div className={`${innerCardBg} p-5 rounded-[2rem] border hover:border-blue-300/30 transition-all shadow-sm group`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-blue-400 tracking-wider uppercase pl-1">{t('pay')}</span>
                                    <div className={`flex items-center gap-2 rounded-full p-1 pl-3 pr-2 shadow-sm border cursor-pointer transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-100/50 hover:bg-white'}`}
                                        onClick={() => { setModalOpen({ type: 'chain', side: 'from' }); setSearchQuery(''); }}>
                                        {fromChain ? (
                                            <div className="flex items-center gap-2">
                                                <img src={fromChain.logoURI} className="w-5 h-5 rounded-full" alt="" />
                                                <span className={`font-bold text-sm ${textMain}`}>{fromChain.name}</span>
                                            </div>
                                        ) : <Loader2 className="animate-spin w-4 h-4 text-blue-500" />}
                                        <ChevronDown size={14} className={textSub} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 min-w-0">
                                    <div className="min-w-0 flex-1">
                                        <input 
                                            type="number" 
                                            placeholder="0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className={`w-full bg-transparent font-black outline-none tracking-tight [&::-webkit-inner-spin-button]:appearance-none ${getFontSize(amount)} ${inputColor}`}
                                        />
                                        {/* Percentage Buttons inside input container, below input */}
                                        {wallet.connected && activeTokenBalance !== '0' && (
                                            <div className="flex gap-1 mt-1">
                                                {[0.25, 0.50, 0.75, 1].map((pct) => (
                                                    <button
                                                        key={pct}
                                                        onClick={() => handlePercentageClick(pct)}
                                                        className={`text-[10px] px-2 py-0.5 rounded transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-gray-300' : 'bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium'}`}
                                                    >
                                                        {pct === 1 ? t('max') : `${pct * 100}%`}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => { setModalOpen({ type: 'token', side: 'from' }); setSearchQuery(''); }}
                                        className={`shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-full ${isDark ? '' : 'shadow-lg shadow-blue-200 hover:shadow-blue-300'} hover:scale-110 transition-all`}
                                    >
                                        {loading.tokens ? (
                                            <Loader2 className="animate-spin w-5 h-5" />
                                        ) : fromToken ? (
                                            <>
                                                <img src={fromToken.logoURI} className="w-6 h-6 rounded-full bg-white/20" alt="" />
                                                <span className="font-bold">{fromToken.symbol}</span>
                                                <ChevronDown size={14} className="text-blue-200" />
                                            </>
                                        ) : <span>{t('select')}</span>}
                                    </button>
                                </div>
                                <div className="h-4 flex items-center justify-between px-1 mt-1">
                                    <div className="text-xs font-medium text-gray-400">
                                        {amount && fromToken && fromToken.priceUSD && (
                                            <span>≈ {formatUSD(amount, fromToken.priceUSD)}</span>
                                        )}
                                    </div>
                                    {fromToken && (
                                        <div className="flex items-center gap-2 text-[10px] font-mono">
                                            <span className={`text-blue-300`}>
                                                {formatAddress(fromToken.address)}
                                            </span>
                                            <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {t('balance')}: {activeTokenBalance}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SWITCH BUTTON */}
                            <div className="relative h-2 flex items-center justify-center z-20">
                                <button 
                                    className={`group p-2.5 rounded-2xl shadow-xl border-4 text-blue-500 hover:text-blue-600 hover:scale-110 transition-all active:rotate-180 duration-500 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-white/40'}`}
                                    onClick={handleReverse}
                                >
                                    <ArrowLeftRight size={18} strokeWidth={3} />
                                </button>
                            </div>

                            {/* TO CARD */}
                            <div className={`${innerCardBg} p-5 rounded-[2rem] border hover:border-blue-200/30 transition-all shadow-sm group mt-2`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-xs font-bold tracking-wider uppercase pl-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('receive')}</span>
                                    <div className={`flex items-center gap-2 rounded-full p-1 pl-3 pr-2 shadow-sm border cursor-pointer transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-100/50 hover:bg-white'}`}
                                        onClick={() => { setModalOpen({ type: 'chain', side: 'to' }); setSearchQuery(''); }}>
                                        {toChain ? (
                                            <div className="flex items-center gap-2">
                                                <img src={toChain.logoURI} className="w-5 h-5 rounded-full" alt="" />
                                                <span className={`font-bold text-sm ${textMain}`}>{toChain.name}</span>
                                            </div>
                                        ) : <Loader2 className="animate-spin w-4 h-4 text-gray-500" />}
                                        <ChevronDown size={14} className={textSub} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 min-w-0">
                                    <div className={`w-full font-black tracking-tight min-w-0 truncate ${quote ? (isDark ? 'text-white' : 'text-gray-800') : 'text-gray-200'} ${getFontSize(quote ? formatAmount(quote.estimate.toAmount / Math.pow(10, toToken.decimals)) : "0.00")}`}>
                                        {loading.quote ? (
                                            <div className="h-10 w-32 bg-gray-200/20 rounded-lg animate-pulse" />
                                        ) : quote ? (
                                            formatAmount(quote.estimate.toAmount / Math.pow(10, toToken.decimals))
                                        ) : "0.00"}
                                    </div>
                                    <button 
                                        onClick={() => { setModalOpen({ type: 'token', side: 'to' }); setSearchQuery(''); }}
                                        className={`shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-full ${isDark ? '' : 'shadow-lg shadow-blue-200 hover:shadow-blue-300'} hover:scale-110 transition-all`}
                                    >
                                        {toToken ? (
                                            <>
                                                <img src={toToken.logoURI} className="w-6 h-6 rounded-full bg-white/20" alt="" />
                                                <span className="font-bold">{toToken.symbol}</span>
                                                <ChevronDown size={14} className="text-blue-200" />
                                            </>
                                        ) : <span>{t('select')}</span>}
                                    </button>
                                </div>
                                <div className="h-4 flex items-center justify-between px-1 mt-1">
                                    <div className="text-xs font-medium text-gray-400">
                                        {quote && toToken && toToken.priceUSD && (
                                            <span>≈ {formatUSD(quote.estimate.toAmount / Math.pow(10, toToken.decimals), toToken.priceUSD)}</span>
                                        )}
                                    </div>
                                    {toToken && <span className="text-[10px] text-gray-400 font-mono">{formatAddress(toToken.address)}</span>}
                                </div>
                            </div>

                            {/* RECIPIENT TOGGLE */}
                            <div className="mt-3 px-1">
                                <button 
                                    onClick={() => setIsRecipientMode(!isRecipientMode)} 
                                    className={`text-xs flex items-center gap-1.5 font-medium transition-colors ${isRecipientMode ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                                >
                                    <UserPlus size={14} /> {t('sendTo')}
                                </button>
                                
                                {isRecipientMode && (
                                    <div className={`mt-2 p-3 rounded-xl border animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{t('recipientAddr')}</div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="0x..." 
                                                value={recipientAddress}
                                                onChange={(e) => setRecipientAddress(e.target.value)}
                                                className={`w-full text-sm bg-transparent outline-none ${isDark ? 'text-white placeholder-gray-600' : 'text-gray-800 placeholder-gray-300'}`}
                                            />
                                            {/* Recent Recipients */}
                                            {recipientHistory.length > 0 && (
                                                <div className="relative group">
                                                    <button className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                                        <History size={14} className="text-gray-500" />
                                                    </button>
                                                    <div className={`absolute right-0 bottom-full mb-2 w-48 rounded-xl shadow-xl border p-1 hidden group-hover:block z-50 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'}`}>
                                                        {recipientHistory.map((addr, idx) => (
                                                            <button 
                                                                key={idx}
                                                                onClick={() => setRecipientAddress(addr)}
                                                                className={`w-full text-left text-xs p-2 rounded-lg truncate ${isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-50'}`}
                                                            >
                                                                {addr}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* DETAILS & STATUS */}
                            <div className="flex-col justify-end py-2 mt-2">
                                {quote && !error && (
                                    <div className={`${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50/50 border-blue-100'} rounded-2xl p-3 border backdrop-blur-sm animate-in slide-in-from-top-4 fade-in duration-500 space-y-1 mb-3`}>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className={`font-medium flex items-center gap-2 ${textSub}`}><Zap size={14} className="text-amber-500"/> {t('networkFee')}</span>
                                            <span className={`font-bold ${textMain}`}>${parseFloat(quote.estimate.gasCosts?.[0]?.amountUSD || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className={`font-medium flex items-center gap-2 ${textSub}`}><ShieldCheck size={14} className="text-green-500"/> {t('provider')}</span>
                                            <span className="font-bold text-blue-500 flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-md text-xs uppercase tracking-wide">
                                                <img src={quote.toolDetails.logoURI} className="w-3 h-3" alt="" />
                                                {quote.toolDetails.name}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                {error && (
                                    <div className="bg-red-500/10 text-red-500 p-3 rounded-2xl text-sm font-medium border border-red-500/20 flex items-center gap-2 animate-in fade-in mb-3">
                                        <Info size={18} /> {error}
                                    </div>
                                )}

                                {/* MAIN BUTTON */}
                                <button
                                    onClick={handleSwap}
                                    disabled={loading.quote || loading.swap || (amount && !quote && !error)}
                                    className={`w-full py-4 rounded-[20px] text-lg font-bold shadow-xl transition-all duration-300 transform active:scale-[0.98] group relative overflow-hidden shrink-0
                                    ${!wallet.connected 
                                        ? 'bg-gray-900 text-white hover:bg-black hover:shadow-2xl' 
                                        : (loading.swap || loading.quote) 
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                                            : error 
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-blue-500/30'
                                    }`}
                                >
                                    <div className="relative z-10 flex items-center justify-center gap-2">
                                        {loading.swap ? <Loader2 className="animate-spin" /> : 
                                        loading.quote ? <Loader2 className="animate-spin" /> : 
                                        !wallet.connected ? t('connect') : 
                                        error ? t('noRoute') : t('confirm')}
                                        {!loading.swap && !loading.quote && !error && wallet.connected && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                                    </div>
                                    
                                    {/* Button Shine Effect */}
                                    {!loading.swap && !error && wallet.connected && (
                                        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:left-[100%] transition-all duration-700 ease-in-out" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- CONTENT: HISTORY --- */}
                    {activeTab === 'history' && (
                         <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-2 duration-300 h-full overflow-hidden">
                             {/* Loading Indicator for history refresh */}
                             {loading.history && (
                                 <div className="flex justify-center py-2">
                                     <span className="text-xs text-gray-400 flex items-center gap-1 animate-pulse">
                                         <RefreshCw size={10} className="animate-spin"/> Syncing status...
                                     </span>
                                 </div>
                             )}
                             
                             <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                                {txHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 py-10">
                                        <div className={`p-4 rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                            <History size={32} className="opacity-50" />
                                        </div>
                                        <p>{t('noHistory')}</p>
                                    </div>
                                ) : (
                                    txHistory.map((tx, idx) => (
                                        <div key={idx} className={`${innerCardBg} p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all group`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${isDark ? 'bg-slate-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                        {new Date(tx.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {/* STATUS BADGE */}
                                                    {getStatusBadge(tx.status)}
                                                </div>
                                                <a href={`https://scan.li.fi/tx/${tx.hash}`} target="_blank" rel="noreferrer" className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-blue-400 bg-slate-800 hover:bg-slate-700' : 'text-blue-500 bg-blue-50 hover:bg-blue-100'}`}>
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                {/* From */}
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img src={tx.fromChain.logoURI} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="" />
                                                        <img src={tx.fromToken.logoURI} className="w-4 h-4 rounded-full absolute -bottom-1 -right-1 border border-white" alt="" />
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold text-sm ${textMain}`}>{tx.amount} {tx.fromToken.symbol}</div>
                                                        <div className="text-[10px] text-gray-500">{tx.fromChain.name}</div>
                                                    </div>
                                                </div>

                                                <ArrowRight size={16} className="text-gray-400" />

                                                {/* To */}
                                                <div className="flex items-center gap-3 justify-end">
                                                     <div className="text-right">
                                                        <div className={`font-bold text-sm ${textMain}`}>{tx.toToken.symbol}</div>
                                                        <div className="text-[10px] text-gray-500">{tx.toChain.name}</div>
                                                    </div>
                                                    <div className="relative">
                                                        <img src={tx.toChain.logoURI} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="" />
                                                        <img src={tx.toToken.logoURI} className="w-4 h-4 rounded-full absolute -bottom-1 -right-1 border border-white" alt="" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                             </div>
                             
                             {/* History Footer: Clear Button */}
                             {txHistory.length > 0 && (
                                <button 
                                    onClick={() => {
                                        if(confirm('Are you sure you want to clear all history?')) {
                                            setTxHistory([]);
                                            localStorage.removeItem('lilixy_tx_history');
                                        }
                                    }}
                                    className="mt-4 w-full py-3 text-sm text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shrink-0"
                                >
                                    <RefreshCw size={14} /> {t('clearHistory')}
                                </button>
                             )}
                         </div>
                    )}

                </div>
            </div>
        </StaticCard>

      </main>

      {/* --- Footer --- */}
      <footer className="relative z-10 w-full py-6 text-center text-gray-400 text-xs space-y-2 pb-8">
         <p>© 2025 Lilixy Bridge. {t('rights')}</p>
         <p className="max-w-md mx-auto px-4 opacity-70">
            Disclaimer: {t('disclaimer')}
         </p>
      </footer>

      {/* Modal Portal */}
      {renderModal()}

    </div>
  );
}
