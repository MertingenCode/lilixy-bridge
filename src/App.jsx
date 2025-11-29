import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, ChevronDown, Wallet, Loader2, Info, Zap, ShieldCheck, ArrowLeftRight, Settings, Search, History, X, ExternalLink, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

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

  // Ref to prevent overwriting tokens during swap
  const isSwapping = useRef(false);

  // --- Init & History Loading ---
  useEffect(() => {
      const savedHistory = localStorage.getItem('lilixy_tx_history');
      if (savedHistory) {
          setTxHistory(JSON.parse(savedHistory));
      }
  }, []);

  // Save to local + State
  const addToHistory = (txHash, fromDetails, toDetails, amountVal) => {
      const newTx = {
          hash: txHash,
          timestamp: Date.now(),
          fromChain: fromDetails.chain,
          toChain: toDetails.chain,
          fromToken: fromDetails.token,
          toToken: toDetails.token,
          amount: amountVal,
          status: 'PENDING' // Initial status
      };
      
      const updatedHistory = [newTx, ...txHistory];
      setTxHistory(updatedHistory);
      localStorage.setItem('lilixy_tx_history', JSON.stringify(updatedHistory));
  };

  // --- LI.FI Status Polling ---
  const updateHistoryStatus = async () => {
      if (txHistory.length === 0) return;
      
      setLoading(prev => ({ ...prev, history: true }));
      
      const updatedHistory = await Promise.all(txHistory.map(async (tx) => {
          // If already done or failed, skip check to save API calls
          if (tx.status === 'DONE' || tx.status === 'FAILED') return tx;

          try {
              const response = await fetch(`${LIFI_API_URL}/status?txHash=${tx.hash}&fromChain=${tx.fromChain.id}&toChain=${tx.toChain.id}`);
              const data = await response.json();
              
              // LI.FI Statuses: NOT_FOUND, INVALID, PENDING, DONE, FAILED
              if (data.status) {
                  return { ...tx, status: data.status };
              }
              return tx;
          } catch (e) {
              console.error("Status check failed for", tx.hash, e);
              return tx;
          }
      }));

      setTxHistory(updatedHistory);
      localStorage.setItem('lilixy_tx_history', JSON.stringify(updatedHistory));
      setLoading(prev => ({ ...prev, history: false }));
  };

  // Auto-refresh history when tab becomes active
  useEffect(() => {
      if (activeTab === 'history') {
          updateHistoryStatus();
          // Optional: Set up an interval to poll every 10s while tab is open
          const interval = setInterval(updateHistoryStatus, 15000);
          return () => clearInterval(interval);
      }
  }, [activeTab]);


  // --- API Requests ---

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
        console.error("Failed to load chains:", err);
        setError("Connection error.");
      }
    };
    fetchChains();
  }, []);

  const fetchTokens = useCallback(async (chainId, side) => {
    if (!chainId) return;
    setLoading(prev => ({ ...prev, tokens: true }));
    try {
      const res = await fetch(`${LIFI_API_URL}/tokens?chains=${chainId}`);
      const data = await res.json();
      const chainTokens = data.tokens[chainId] || [];
      const defaultToken = chainTokens.find(t => t.symbol === 'USDC' || t.symbol === 'ETH' || t.symbol === 'USDT') || chainTokens[0];

      setTokens(prev => ({ ...prev, [side]: chainTokens }));
      if (side === 'from') setFromToken(defaultToken);
      if (side === 'to') setToToken(defaultToken);
      
    } catch (err) {
      console.error("Failed to load tokens:", err);
    } finally {
      setLoading(prev => ({ ...prev, tokens: false }));
    }
  }, []);

  // Trigger fetch only if NOT swapping
  useEffect(() => {
    if (isSwapping.current) return;
    if (fromChain) fetchTokens(fromChain.id, 'from');
  }, [fromChain, fetchTokens]);

  useEffect(() => {
    if (isSwapping.current) return;
    if (toChain) fetchTokens(toChain.id, 'to');
  }, [toChain, fetchTokens]);

  // --- Custom Token Search (useEffect) ---
  useEffect(() => {
    const searchTokenByAddress = async () => {
        setImportedToken(null);
        
        const isAddress = /^0x[a-fA-F0-9]{40}$/.test(searchQuery);
        
        if (modalOpen.type === 'token' && isAddress) {
            const currentChain = modalOpen.side === 'from' ? fromChain : toChain;
            if (!currentChain) return;

            const list = tokens[modalOpen.side] || [];
            const exists = list.find(t => t.address.toLowerCase() === searchQuery.toLowerCase());
            if (exists) return; 

            setIsSearchingToken(true);
            try {
                const res = await fetch(`${LIFI_API_URL}/token?chain=${currentChain.id}&token=${searchQuery}`);
                const data = await res.json();
                
                if (data && data.address) {
                    setImportedToken(data);
                }
            } catch (err) {
                console.error("Token not found:", err);
            } finally {
                setIsSearchingToken(false);
            }
        }
    };

    const timer = setTimeout(searchTokenByAddress, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, modalOpen, fromChain, toChain, tokens]);


  // Get Quote
  useEffect(() => {
    const getQuote = async () => {
      if (!amount || parseFloat(amount) <= 0 || !fromChain || !toChain || !fromToken || !toToken) {
        setQuote(null);
        return;
      }

      setLoading(prev => ({ ...prev, quote: true }));
      setError(null);
      setQuote(null);

      try {
        const amountRaw = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toLocaleString('fullwide', { useGrouping: false }).split('.')[0];
        
        const DUMMY_ADDRESS = '0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0'; 

        const params = new URLSearchParams({
            fromChain: fromChain.id,
            toChain: toChain.id,
            fromToken: fromToken.address,
            toToken: toToken.address,
            fromAmount: amountRaw,
            fromAddress: wallet.address || DUMMY_ADDRESS, 
            integrator: 'lilixy',
            fee: '0.0025',
        });

        const res = await fetch(`${LIFI_API_URL}/quote?${params}`);
        const data = await res.json();

        if (data.message) throw new Error(data.message);
        setQuote(data);
      } catch (err) {
        console.error("Quote error:", err);
        setError("No route found or insufficient liquidity.");
      } finally {
        setLoading(prev => ({ ...prev, quote: false }));
      }
    };

    const timer = setTimeout(() => getQuote(), 600);
    return () => clearTimeout(timer);
  }, [amount, fromChain, toChain, fromToken, toToken, wallet.address]);


  // --- Wallet ---
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
      } catch (error) { console.error(error); }
    } else { alert("Wallet not found!"); }
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
        
        // Add to history
        addToHistory(
            txHash,
            { chain: fromChain, token: fromToken },
            { chain: toChain, token: toToken },
            amount
        );
        // Switch to history tab on success
        setActiveTab('history');

        alert(`Transaction Successful! Hash: ${txHash}`);
    } catch (err) {
        alert(`Error: ${err.message}`);
    } finally {
        setLoading(prev => ({ ...prev, swap: false }));
    }
  };

  // --- REVERSE (SWAP) LOGIC ---
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

  // --- Render Functions ---

  // Helper for Status Badge
  const getStatusBadge = (status) => {
      switch (status) {
          case 'DONE':
              return <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full"><CheckCircle2 size={12} /> SUCCESS</span>;
          case 'FAILED':
              return <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full"><XCircle size={12} /> FAILED</span>;
          default: // PENDING, NOT_FOUND
              return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full"><Clock size={12} className="animate-spin" /> PENDING</span>;
      }
  };

  // Modal
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
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl overflow-hidden border border-blue-100 ring-4 ring-blue-500/10">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-gray-800 text-lg tracking-tight">
                        {isChain ? 'Select Chain' : 'Select Token'}
                    </h3>
                    <button onClick={() => { setModalOpen({ type: null }); setImportedToken(null); }} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4 bg-white relative">
                    <div className="relative">
                         <input 
                            type="text" 
                            placeholder={isChain ? "Search chain..." : "Name, symbol or address (0x...)"}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-5 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        <div className="absolute left-3 top-3.5 text-gray-400">
                            {isSearchingToken ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </div>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1 bg-white">
                    {filteredList.map((item) => (
                        <button
                            key={item.id || item.address}
                            onClick={() => {
                                if (isChain) {
                                    if (modalOpen.side === 'from') setFromChain(item);
                                    else setToChain(item);
                                } else {
                                    if (modalOpen.side === 'from') setFromToken(item);
                                    else setToToken(item);
                                }
                                setModalOpen({ type: null });
                                setSearchQuery('');
                                setImportedToken(null);
                            }}
                            className={`w-full flex items-center gap-4 p-3 hover:bg-blue-50 rounded-2xl transition-all group text-left border border-transparent hover:border-blue-100 
                            ${importedToken && item.address === importedToken.address ? 'bg-blue-50/50 border-blue-100' : ''}`}
                        >
                            <img 
                                src={item.logoURI || 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/default_token.png'} 
                                onError={(e) => { e.target.src = 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/default_token.png' }}
                                alt={item.name} 
                                className="w-10 h-10 rounded-full bg-white shadow-sm object-cover p-0.5" 
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors truncate">{item.name}</div>
                                    {importedToken && item.address === importedToken.address && (
                                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">FOUND</span>
                                    )}
                                </div>
                                { !isChain && (
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-500 font-medium">{item.symbol}</span>
                                        {item.address && (
                                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                                                {formatAddress(item.address)}
                                            </span>
                                        )}
                                    </div>
                                ) }
                            </div>
                        </button>
                    ))}
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

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans relative overflow-hidden selection:bg-blue-200 selection:text-blue-900 flex flex-col">
      
      {/* --- Dynamic Background Effects --- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-400/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-400/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-indigo-300/20 rounded-full blur-[80px]" />
      </div>

      {/* --- Header --- */}
      <header className="relative z-10 w-full px-6 py-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="text-3xl font-black tracking-tight pr-4 pb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 leading-normal">
            Lilixy
        </div>

        <button 
            onClick={connectWallet}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-200/50
            ${wallet.connected 
                ? 'bg-white text-blue-600 border border-blue-100' 
                : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-blue-400/50'
            }`}
        >
            <Wallet size={18} className={wallet.connected ? "text-blue-500" : "text-white"} />
            {wallet.connected ? formatAddress(wallet.address) : 'Connect Wallet'}
        </button>
      </header>

      {/* --- Main Stage --- */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-grow px-4 pb-8">
        
        <StaticCard className="w-full max-w-[500px]">
            {/* Card Height: removed fixed h-[640px], added min-h-[500px] and transition for smooth resize */}
            <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/50 p-2 relative overflow-hidden ring-1 ring-white/60 min-h-[500px] h-auto transition-[height] duration-500 ease-in-out flex flex-col">
                
                {/* Inner Glow Effect */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none rounded-[3rem]" />

                <div className="p-6 md:p-8 relative z-10 flex flex-col h-full">

                    {/* --- Tab Switcher --- */}
                    <div className="flex justify-center mb-4 shrink-0">
                        <div className="bg-gray-100/80 p-1.5 rounded-full flex gap-1">
                            <button
                                onClick={() => setActiveTab('bridge')}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                                    activeTab === 'bridge' 
                                    ? 'bg-white text-blue-600 shadow-md' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Bridge
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                                    activeTab === 'history' 
                                    ? 'bg-white text-blue-600 shadow-md' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                History
                            </button>
                        </div>
                    </div>

                    {/* --- CONTENT: BRIDGE --- */}
                    {activeTab === 'bridge' && (
                        <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full">
                             {/* FROM CARD */}
                            <div className="bg-gradient-to-br from-blue-50/80 to-white/90 p-5 rounded-[2rem] border border-blue-100/50 hover:border-blue-300/50 transition-all shadow-sm group">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-blue-400 tracking-wider uppercase pl-1">You pay</span>
                                    <div className="flex items-center gap-2 bg-white/80 rounded-full p-1 pl-3 pr-2 shadow-sm border border-blue-50/50 cursor-pointer hover:bg-white transition-colors"
                                        onClick={() => { setModalOpen({ type: 'chain', side: 'from' }); setSearchQuery(''); }}>
                                        {fromChain ? (
                                            <div className="flex items-center gap-2">
                                                <img src={fromChain.logoURI} className="w-5 h-5 rounded-full" alt="" />
                                                <span className="font-bold text-sm text-gray-700">{fromChain.name}</span>
                                            </div>
                                        ) : <Loader2 className="animate-spin w-4 h-4 text-blue-500" />}
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                </div>

                                {/* Flexible container for Input and Button */}
                                <div className="flex items-center justify-between gap-4 min-w-0">
                                    {/* Input Container: min-w-0 ensures it shrinks properly */}
                                    <div className="min-w-0 flex-1">
                                        <input 
                                            type="number" 
                                            placeholder="0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className={`w-full bg-transparent font-black text-gray-800 placeholder-gray-200 outline-none tracking-tight ${getFontSize(amount)}`}
                                        />
                                    </div>
                                    
                                    <button 
                                        onClick={() => { setModalOpen({ type: 'token', side: 'from' }); setSearchQuery(''); }}
                                        className="shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-105 transition-all"
                                    >
                                        {loading.tokens ? (
                                            <Loader2 className="animate-spin w-5 h-5" />
                                        ) : fromToken ? (
                                            <>
                                                <img src={fromToken.logoURI} className="w-6 h-6 rounded-full bg-white/20" alt="" />
                                                <span className="font-bold">{fromToken.symbol}</span>
                                                <ChevronDown size={14} className="text-blue-200" />
                                            </>
                                        ) : <span>Select</span>}
                                    </button>
                                </div>
                                {/* FOOTER: USD LEFT, ADDRESS RIGHT */}
                                <div className="h-4 flex items-center justify-between px-1 mt-1">
                                    <div className="text-xs font-medium text-gray-400">
                                        {amount && fromToken && fromToken.priceUSD && (
                                            <span>≈ {formatUSD(amount, fromToken.priceUSD)}</span>
                                        )}
                                    </div>
                                    {fromToken && <span className="text-[10px] text-blue-300 font-mono">{formatAddress(fromToken.address)}</span>}
                                </div>
                            </div>

                            {/* SWITCH BUTTON (FUNCTIONAL) */}
                            <div className="relative h-2 flex items-center justify-center z-20">
                                <button 
                                    className="group bg-white p-2.5 rounded-2xl shadow-xl border-4 border-white/40 text-blue-500 hover:text-blue-600 hover:scale-110 transition-all active:rotate-180 duration-500"
                                    onClick={handleReverse}
                                >
                                    <ArrowLeftRight size={18} strokeWidth={3} />
                                </button>
                            </div>

                            {/* TO CARD */}
                            <div className="bg-gradient-to-br from-gray-50/80 to-white/90 p-5 rounded-[2rem] border border-gray-100/50 hover:border-blue-200/50 transition-all shadow-sm group mt-2">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-400 tracking-wider uppercase pl-1">You receive</span>
                                    <div className="flex items-center gap-2 bg-white/80 rounded-full p-1 pl-3 pr-2 shadow-sm border border-gray-100/50 cursor-pointer hover:bg-white transition-colors"
                                        onClick={() => { setModalOpen({ type: 'chain', side: 'to' }); setSearchQuery(''); }}>
                                        {toChain ? (
                                            <div className="flex items-center gap-2">
                                                <img src={toChain.logoURI} className="w-5 h-5 rounded-full" alt="" />
                                                <span className="font-bold text-sm text-gray-700">{toChain.name}</span>
                                            </div>
                                        ) : <Loader2 className="animate-spin w-4 h-4 text-gray-500" />}
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 min-w-0">
                                    {/* Quote Display Container */}
                                    <div className={`w-full font-black tracking-tight min-w-0 truncate ${quote ? 'text-gray-800' : 'text-gray-200'} ${getFontSize(quote ? formatAmount(quote.estimate.toAmount / Math.pow(10, toToken.decimals)) : "0.00")}`}>
                                        {loading.quote ? (
                                            <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />
                                        ) : quote ? (
                                            formatAmount(quote.estimate.toAmount / Math.pow(10, toToken.decimals))
                                        ) : "0.00"}
                                    </div>
                                    <button 
                                        onClick={() => { setModalOpen({ type: 'token', side: 'to' }); setSearchQuery(''); }}
                                        className="shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-105 transition-all"
                                    >
                                        {toToken ? (
                                            <>
                                                <img src={toToken.logoURI} className="w-6 h-6 rounded-full bg-white/20" alt="" />
                                                <span className="font-bold">{toToken.symbol}</span>
                                                <ChevronDown size={14} className="text-blue-200" />
                                            </>
                                        ) : <span>Select</span>}
                                    </button>
                                </div>
                                {/* FOOTER: USD LEFT, ADDRESS RIGHT */}
                                <div className="h-4 flex items-center justify-between px-1 mt-1">
                                    <div className="text-xs font-medium text-gray-400">
                                        {quote && toToken && toToken.priceUSD && (
                                            <span>≈ {formatUSD(quote.estimate.toAmount / Math.pow(10, toToken.decimals), toToken.priceUSD)}</span>
                                        )}
                                    </div>
                                    {toToken && <span className="text-[10px] text-gray-300 font-mono">{formatAddress(toToken.address)}</span>}
                                </div>
                            </div>

                            {/* DETAILS & STATUS */}
                            <div className="flex-col justify-end py-2 mt-2">
                                {quote && !error && (
                                    <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100 backdrop-blur-sm animate-in slide-in-from-top-4 fade-in duration-500 space-y-1 mb-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-medium flex items-center gap-2"><Zap size={14} className="text-amber-500"/> Network Fee</span>
                                            <span className="font-bold text-gray-700">${parseFloat(quote.estimate.gasCosts?.[0]?.amountUSD || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-medium flex items-center gap-2"><ShieldCheck size={14} className="text-green-500"/> Provider</span>
                                            <span className="font-bold text-blue-600 flex items-center gap-1.5 bg-blue-100 px-2 py-0.5 rounded-md text-xs uppercase tracking-wide">
                                                <img src={quote.toolDetails.logoURI} className="w-3 h-3" alt="" />
                                                {quote.toolDetails.name}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                {error && (
                                    <div className="bg-red-50 text-red-500 p-3 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-2 animate-in fade-in mb-3">
                                        <Info size={18} /> {error}
                                    </div>
                                )}

                                {/* MAIN BUTTON (Moved closer to content via flex layout and margins) */}
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
                                        !wallet.connected ? 'Connect Wallet' : 
                                        error ? 'No Route' : 'Confirm Transaction'}
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
                                        <div className="p-4 bg-gray-50 rounded-full">
                                            <History size={32} className="opacity-50" />
                                        </div>
                                        <p>No transaction history yet.</p>
                                    </div>
                                ) : (
                                    txHistory.map((tx, idx) => (
                                        <div key={idx} className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full uppercase tracking-wider">
                                                        {new Date(tx.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {/* STATUS BADGE */}
                                                    {getStatusBadge(tx.status)}
                                                </div>
                                                <a href={`https://scan.li.fi/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-full transition-colors">
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
                                                        <div className="font-bold text-gray-800 text-sm">{tx.amount} {tx.fromToken.symbol}</div>
                                                        <div className="text-[10px] text-gray-500">{tx.fromChain.name}</div>
                                                    </div>
                                                </div>

                                                <ArrowRight size={16} className="text-gray-300" />

                                                {/* To */}
                                                <div className="flex items-center gap-3 justify-end">
                                                     <div className="text-right">
                                                        <div className="font-bold text-gray-800 text-sm">{tx.toToken.symbol}</div>
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
                                    className="mt-4 w-full py-3 text-sm text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shrink-0"
                                >
                                    <RefreshCw size={14} /> Clear History
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
         <p>© 2024 Lilixy Bridge. All rights reserved.</p>
         <p className="max-w-md mx-auto px-4 opacity-70">
            Disclaimer: Lilixy acts as a frontend interface for the LI.FI protocol. We do not hold custody of funds.
            Use at your own risk. Bridge fees and slippage may vary based on network conditions.
         </p>
      </footer>

      {/* Modal Portal */}
      {renderModal()}

    </div>
  );
}