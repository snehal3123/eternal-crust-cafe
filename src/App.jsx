import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Coffee, Utensils, Plus, Minus, ChevronLeft, LayoutDashboard, LogOut,
  CheckCircle, Clock, ChefHat, Bell, Edit, Trash2, ToggleLeft, ToggleRight, QrCode, Printer,
  CreditCard, Banknote, X, History, Download, Image as ImageIcon, Package, AlertTriangle, Upload, IceCream, Lock, Eye, EyeOff, Settings, Volume2, VolumeX, Mic, Search, MessageSquare, Tag
} from 'lucide-react';

/* ---------------- AUDIO & VOICE ENGINE ---------------- */
let AC = null;
let SOUND_ENABLED = true;
let VOICE_ENABLED = true;

const SFX = {
  click: [[900, 0, 0.03, 'square', 0.03]],
  add: [[600, 0, 0.07], [900, 0.07, 0.1]],
  remove: [[500, 0, 0.07], [300, 0.07, 0.1]],
  success: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.35]],
  save: [[700, 0, 0.08], [1000, 0.08, 0.15]],
  del: [[400, 0, 0.1, 'triangle'], [250, 0.1, 0.2, 'triangle']],
  error: [[200, 0, 0.3, 'sawtooth', 0.08]],
  ring: [[880, 0, 1.5, 'sine', 0.16], [2434, 0, 0.9, 'sine', 0.07], [880, 0.45, 1.5, 'sine', 0.16], [2434, 0.45, 0.9, 'sine', 0.07]],
};

const playSfx = (name) => {
  if (!SOUND_ENABLED) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    (SFX[name] || []).forEach(([f, t, d, type = 'sine', v = 0.1]) => {
      const o = AC.createOscillator(), g = AC.createGain(), s = AC.currentTime + t;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + d);
      o.connect(g); g.connect(AC.destination); o.start(s); o.stop(s + d + 0.02);
    });
  } catch (e) { /* ignore */ }
};

const speak = (txt) => {
  if (!VOICE_ENABLED || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => /(female|samantha|zira|google us english|heera|veena)/i.test(v.name));
    if (femaleVoice) u.voice = femaleVoice;
    u.pitch = 1.1; u.rate = 0.95; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch(e) {}
};

/* ---------------- CONFIG & DATA ---------------- */
const UPI_ID = 'snehaltitkare58-2@okicici';
const CAFE_NAME = 'ETERNAL CRUST CAFÉ';
const CAFE_ADDRESS = 'Shop no 20, Sai Arcade, Neetaji Chowk, Ulhasnagar';

const getQrUrl = (url) => `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&color=6b21a8&data=${encodeURIComponent(url)}`;

const readImg = (f) => new Promise((res) => {
  const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); const s = Math.min(1, 600 / Math.max(im.width, im.height)); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); }; im.src = r.result; }; r.readAsDataURL(f);
});

const initialMenu = [
  { id: 'p1', category: 'Pizza', name: 'Small Pizza', price: 139, stock: true },
  { id: 'p2', category: 'Pizza', name: 'Classic Margarita Pizza', price: 149, v: [['Regular', 149], ['Large', 189]], stock: true }
];

const initialStock = [{ id: 'i1', name: 'Pizza Base', qty: 40, price: 500, min: 10 }];
const initialIceCream = [{ id: 'ic1', name: 'Vanilla', qty: 50, price: 400, min: 10 }];
const initialTables = Array.from({ length: 15 }, (_, i) => ({ id: `t${i + 1}`, name: `${i + 1}` }));

/* ---------------- FIREBASE CONFIG ---------------- */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAsmMqePWXD27z7EMAOUetSC5HqV03ScpM",
  authDomain: "eternalcrust.firebaseapp.com",
  projectId: "eternalcrust",
  storageBucket: "eternalcrust.firebasestorage.app",
  messagingSenderId: "261216829451",
  appId: "1:261216829451:web:325aaac3d97a5a9280070e",
  measurementId: "G-2EWDLMFX8K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------------- MAIN APP ---------------- */
export default function App() {
  const [sessionTable, setSessionTable] = useState(() => localStorage.getItem('ec_active_table') || null);
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('ec_cust_name') || '');
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('ec_cust_phone') || '');
  const [isAdminAuth, setIsAdminAuth] = useState(() => localStorage.getItem('ec_admin_auth') === 'true');
  const [mode, setMode] = useState(() => {
    if (localStorage.getItem('ec_admin_auth') === 'true') return 'admin';
    if (sessionTable) return 'customer';
    return 'landing';
  });
  const [table, setTable] = useState(sessionTable);

  const [menuItems, setMenuItems] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [tables, setTables] = useState([]);
  const [stockInv, setStockInv] = useState([]);
  const [iceInv, setIceInv] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [cafeLogo, setCafeLogo] = useState('');
  const [customBanner, setCustomBanner] = useState('');
  const [categoryImages, setCategoryImages] = useState({});

  useEffect(() => {
    const unsubMenu = onSnapshot(collection(db, 'eternal_menu_v2'), (snap) => {
      if (snap.empty) {
        initialMenu.forEach(item => setDoc(doc(db, 'eternal_menu_v2', item.id), item));
      } else {
        setMenuItems(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setActiveOrders(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const unsubHistory = onSnapshot(collection(db, 'history'), (snap) => {
      setOrderHistory(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const unsubTables = onSnapshot(collection(db, 'tables'), (snap) => {
      if (snap.empty) {
        initialTables.forEach(t => setDoc(doc(db, 'tables', t.id), t));
      } else {
        setTables(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }
    });

    const unsubStock = onSnapshot(collection(db, 'stock'), (snap) => {
      if (snap.empty) {
        initialStock.forEach(s => setDoc(doc(db, 'stock', s.id), s));
      } else {
        setStockInv(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }
    });

    const unsubIce = onSnapshot(collection(db, 'icecream'), (snap) => {
      if (snap.empty) {
        initialIceCream.forEach(i => setDoc(doc(db, 'icecream', i.id), i));
      } else {
        setIceInv(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }
    });

    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (snap) => {
      if (snap.exists()) {
        setCafeLogo(snap.data().logo || '');
        setCustomBanner(snap.data().banner || '');
        setCategoryImages(snap.data().catImages || {});
      }
    });

    return () => {
      unsubMenu(); unsubOrders(); unsubHistory(); unsubTables(); unsubStock(); unsubIce(); unsubCoupons(); unsubSettings();
    };
  }, []);

  const placeOrder = async (tbl, cart, total, payment, name, phone, discount = 0) => {
    const numericId = Math.floor(10000 + Math.random() * 90000).toString();
    const finalTotal = Math.max(0, total - discount);
    const newOrder = { id: numericId, table: tbl, customerName: name, customerPhone: phone, items: cart, total: finalTotal, originalTotal: total, discount, payment, status: payment === 'Online' ? 'Verifying' : 'Pending', time: Date.now() };
    await setDoc(doc(db, 'orders', numericId), newOrder);
    playSfx('success');
  };

  const completeOrder = async (o) => {
    const now = Date.now();
    const completedData = { ...o, status: 'Completed', completedAt: now };
    await setDoc(doc(db, 'history', o.id), completedData);
    await deleteDoc(doc(db, 'orders', o.id));
    playSfx('save');

    // Send WhatsApp Bill with Proper Date/Time
    if (o.customerPhone) {
      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString();
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const itemsText = o.items.map(i => `${i.name} | ${i.qty} | ₹${i.price * i.qty}`).join('\n');
      const discountText = o.discount ? `Discount Applied: -₹${o.discount}\n` : '';
      const msg = `*${CAFE_NAME}*\n${CAFE_ADDRESS}\n--------------------\n*Cash Memo*\nDate : ${dateStr} ${timeStr}   Bill No.: #${o.id}\nT.No.: ${o.table}   Cust.: ${o.customerName || 'Guest'}\n--------------------\n*Particulars | Qty | Amount*\n${itemsText}\n--------------------\n${discountText}*Total : ₹${o.total}*\n--------------------\n    Thank You      Visit Again ✨`;
      const wpUrl = `https://wa.me/91${o.customerPhone}?text=${encodeURIComponent(msg)}`;
      window.open(wpUrl, '_blank');
    }

    // Auto exit table session if current customer completes order
    if (table === String(o.table)) {
      exitTable();
    }
  };

  const cancelOrder = async (id) => {
    await deleteDoc(doc(db, 'orders', id));
    playSfx('del');
  };

  const joinTable = (tblName, name, phone) => {
    setTable(tblName);
    setCustomerName(name);
    setCustomerPhone(phone);
    setSessionTable(tblName);
    localStorage.setItem('ec_active_table', tblName);
    localStorage.setItem('ec_cust_name', name);
    localStorage.setItem('ec_cust_phone', phone);
    setMode('customer');
  };

  const exitTable = () => {
    localStorage.removeItem('ec_active_table');
    localStorage.removeItem('ec_cust_name');
    localStorage.removeItem('ec_cust_phone');
    setSessionTable(null);
    setCustomerName('');
    setCustomerPhone('');
    setTable(null);
    setMode('landing');
  };

  return (
    <div className="min-h-screen bg-purple-950 font-sans text-slate-100 selection:bg-purple-500">
      {mode === 'landing' && <LandingView tables={tables} activeOrders={activeOrders} logo={cafeLogo} onJoin={joinTable} onAdminLogin={() => { setIsAdminAuth(true); localStorage.setItem('ec_admin_auth', 'true'); setMode('admin'); }} />}
      {mode === 'customer' && <CustomerView tableNumber={table} customerName={customerName} customerPhone={customerPhone} menuItems={menuItems} activeOrders={activeOrders} coupons={coupons} banner={customBanner} catImages={categoryImages} onPlaceOrder={placeOrder} onExit={exitTable} />}
      {mode === 'admin' && isAdminAuth && <AdminDashboard {...{ activeOrders, setActiveOrders, orderHistory, setOrderHistory, completeOrder, cancelOrder, menuItems, setMenuItems, tables, setTables, stockInv, setStockInv, iceInv, setIceInv, coupons, setCoupons, cafeLogo, setCafeLogo, customBanner, setCustomBanner, categoryImages, setCategoryImages, db }} onExit={() => { setIsAdminAuth(false); localStorage.removeItem('ec_admin_auth'); setMode('landing'); }} />}
    </div>
  );
}

/* ---------------- SHARED COMPONENTS ---------------- */
const inpStyle = 'w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-purple-600 outline-none font-bold text-slate-900';
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-[2rem] p-6 w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-black">{title}</h3><button onClick={() => { playSfx('click'); onClose(); }} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button></div>
        {children}
      </div>
    </div>
  );
}
function DelBtn({ onDel }) {
  const [a, setA] = useState(false);
  useEffect(() => { if (a) { const t = setTimeout(() => setA(false), 3000); return () => clearTimeout(t); } }, [a]);
  return <button onClick={() => { playSfx('click'); if (a) onDel(); else setA(true); }} className={`p-2 rounded-xl transition-colors text-xs font-black shrink-0 ${a ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50'}`}>{a ? 'Sure?' : <Trash2 className="w-4 h-4" />}</button>;
}

/* ---------------- LANDING VIEW ---------------- */
function LandingView({ tables, activeOrders, logo, onJoin, onAdminLogin }) {
  const [showLogin, setShowLogin] = useState(false);
  const [wi, setWi] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showModal, setShowModal] = useState(false);

  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => (parseInt(a.name) || 0) - (parseInt(b.name) || 0));
  }, [tables]);

  const currentTable = sortedTables[wi] || { name: '1' };
  const isBooked = activeOrders.some(o => o.table === String(currentTable.name) && o.status !== 'Completed');

  const handleJoinClick = () => { playSfx('click'); setShowModal(true); };
  const handleProceed = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || phone.length < 10) return playSfx('error');
    playSfx('success');
    onJoin(currentTable.name, name.trim(), phone.trim());
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-b from-purple-950 via-purple-900 to-indigo-950" onWheel={(e) => setWi(p => e.deltaY > 0 ? Math.min(p + 1, sortedTables.length - 1) : Math.max(p - 1, 0))}>
      <div className="absolute top-6 right-6 z-50"><button onClick={() => { playSfx('click'); setShowLogin(true); }} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white"><Lock className="w-5 h-5" /></button></div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center text-center z-10 mb-8 w-full">
          <div className="w-28 h-28 bg-purple-800/50 rounded-full shadow-[0_0_40px_rgba(168,85,247,0.4)] mb-4 backdrop-blur-sm border-4 border-purple-400/50 overflow-hidden flex items-center justify-center shrink-0">
            {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <Coffee className="w-12 h-12 text-purple-200" />}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-1 tracking-tight drop-shadow-lg">{CAFE_NAME}</h1>
          <p className="text-purple-300 text-sm md:text-base font-medium tracking-wide">Good food travels better.</p>
        </div>

        <div className="relative flex flex-col items-center justify-center bg-white/5 backdrop-blur-md p-8 rounded-[3rem] border border-white/10 shadow-2xl">
          <div className="text-sm font-black uppercase tracking-widest text-purple-300 mb-6">Select Your Table</div>
          <div className="flex items-center gap-6 mb-6">
            <button onClick={() => { playSfx('click'); setWi(p => Math.max(p - 1, 0)); }} className="p-4 bg-purple-800/80 rounded-full hover:bg-purple-700 shadow-lg text-white"><Minus className="w-6 h-6" /></button>
            <div className="w-32 h-32 bg-white text-purple-950 rounded-full flex items-center justify-center text-6xl font-black shadow-[0_0_50px_rgba(255,255,255,0.2)] border-8 border-purple-400/50 z-20 transition-all">
              {currentTable.name}
            </div>
            <button onClick={() => { playSfx('click'); setWi(p => Math.min(p + 1, sortedTables.length - 1)); }} className="p-4 bg-purple-800/80 rounded-full hover:bg-purple-700 shadow-lg text-white"><Plus className="w-6 h-6" /></button>
          </div>

          {isBooked ? (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-3 rounded-2xl font-bold text-sm mb-4 text-center">
              Table {currentTable.name} is already booked/occupied. Please select another table.
            </div>
          ) : null}

          <button 
            disabled={isBooked}
            onClick={handleJoinClick} 
            className="w-64 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-xl py-4 rounded-full shadow-[0_10px_30px_rgba(147,51,234,0.4)] active:scale-95 transition-all"
          >
            {isBooked ? 'Already Booked' : 'JOIN TABLE'}
          </button>
        </div>
      </div>

      {showModal && (
        <Modal title={`Join Table ${currentTable.name}`} onClose={() => setShowModal(false)}>
          <form onSubmit={handleProceed} className="space-y-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase">Your Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma" className={inpStyle} required /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">WhatsApp Phone Number</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" className={inpStyle} required maxLength={10} /></div>
            <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-4 rounded-xl mt-2 shadow-lg">Start Ordering</button>
          </form>
        </Modal>
      )}

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} onSuccess={onAdminLogin} />}
    </div>
  );
}

function AdminLoginModal({ onClose, onSuccess }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [sp, setSp] = useState(false); const [err, setErr] = useState('');
  return (
    <Modal title="Admin Access" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (u === 'Eternalcrust2026' && p === 'Eternalcrust2026@forever') { playSfx('success'); onSuccess(); } else { playSfx('error'); setErr('Invalid credentials'); } }} className="space-y-4">
        {err && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center">{err}</div>}
        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label><input type="text" name="username" value={u} onChange={e => setU(e.target.value)} className={inpStyle} autoComplete="username" placeholder="Enter username" /></div>
        <div className="relative"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label><input type={sp ? 'text' : 'password'} name="password" value={p} onChange={e => setP(e.target.value)} className={inpStyle} autoComplete="current-password" placeholder="Enter password" /><button type="button" onClick={() => setSp(!sp)} className="absolute right-4 top-[34px] text-slate-400">{sp ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div>
        <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-4 rounded-xl mt-2">Login</button>
      </form>
    </Modal>
  );
}

/* ---------------- CUSTOMER VIEW WITH BANNER & CATEGORY IMAGES ---------------- */
function CustomerView({ tableNumber, customerName, customerPhone, menuItems, activeOrders, coupons, banner, catImages, onPlaceOrder, onExit }) {
  const [cart, setCart] = useState([]); 
  const [checkout, setCheckout] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const bannerRef = useRef(null);

  const defaultBanner = {
    title: "More Cheese. More Happiness.",
    desc: "Hot, cheesy and baked with love, just for you.",
    bg: "from-purple-900 to-indigo-900"
  };

  // Auto scroll banner smoothly on mount
  useEffect(() => {
    if (bannerRef.current) {
      const el = bannerRef.current;
      let scrollAmount = 0;
      const scrollTimer = setInterval(() => {
        if (el) {
          scrollAmount += 1;
          if (scrollAmount >= el.scrollWidth - el.clientWidth) {
            scrollAmount = 0;
          }
          el.scrollTo({ left: scrollAmount, behavior: 'smooth' });
        }
      }, 50);
      return () => clearInterval(scrollTimer);
    }
  }, []);

  const cats = ['All', ...new Set(menuItems.map(i => i.category))]; 
  const [activeCat, setActiveCat] = useState('All');

  const rawTotal = cart.reduce((s, c) => s + c.price * c.qty, 0); 
  const discountAmount = selectedCoupon ? Math.round((rawTotal * selectedCoupon.discount) / 100) : 0;
  const total = Math.max(0, rawTotal - discountAmount);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  const tableOrder = activeOrders.find(o => o.table === String(tableNumber));
  const status = tableOrder ? tableOrder.status : null;

  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current !== 'Ready' && status === 'Ready') {
      playSfx('success');
      speak(`Your order for Table ${tableNumber} is ready! Please pick it up from the counter.`);
    }
    prevStatus.current = status;
  }, [status, tableNumber]);

  const addVariant = (item, vName, vPrice) => {
    playSfx('add');
    const k = item.id + '_' + vName;
    const nm = `${item.name} (${vName})`;
    setCart(p => p.find(c => c.key === k) ? p.map(c => c.key === k ? { ...c, qty: c.qty + 1 } : c) : [...p, { key: k, name: nm, price: vPrice, qty: 1 }]);
  };

  const addSimple = (item) => {
    playSfx('add');
    const k = item.id;
    setCart(p => p.find(c => c.key === k) ? p.map(c => c.key === k ? { ...c, qty: c.qty + 1 } : c) : [...p, { key: k, name: item.name, price: item.price, qty: 1 }]);
  };

  const chg = (k, d) => { playSfx(d > 0 ? 'add' : 'remove'); setCart(p => p.map(c => c.key === k ? { ...c, qty: c.qty + d } : c).filter(c => c.qty > 0)); };

  const applyCoupon = (c) => { playSfx('click'); setSelectedCoupon(c); setCouponError(''); };

  const verifyCouponCode = () => {
    const found = coupons.find(c => c.code.toLowerCase() === couponCodeInput.trim().toLowerCase());
    if (found) { playSfx('success'); setSelectedCoupon(found); setCouponError(''); }
    else { playSfx('error'); setCouponError('Invalid Coupon Code'); }
  };

  const displayedMenu = activeCat === 'All' ? menuItems : menuItems.filter(i => i.category === activeCat);

  return (
    <div className="bg-purple-950 fixed inset-0 flex justify-center overflow-hidden">
      <div className="bg-slate-50 w-full max-w-md mx-auto sm:rounded-[2.5rem] sm:shadow-2xl overflow-hidden flex flex-col h-full relative text-slate-800">
        <header className="bg-purple-900 px-4 pt-4 pb-3 text-white shadow-md z-10 shrink-0">
          <div className="flex items-center justify-between mb-3">
            {onExit && status !== 'Pending' && status !== 'Preparing' && status !== 'Verifying' ? (
              <button onClick={() => { playSfx('click'); onExit(); }} className="p-2 -ml-2 bg-purple-800 rounded-full flex items-center gap-1 text-xs font-bold"><ChevronLeft className="w-4 h-4" /> Exit</button>
            ) : <div className="w-9 h-9" />}
            <div className="bg-purple-950/50 px-4 py-1.5 rounded-full border border-purple-700/50"><h1 className="text-sm font-black tracking-widest uppercase text-purple-200">Table {tableNumber} | {customerName || 'Guest'}</h1></div>
            <div className="w-9 h-9" />
          </div>

          {/* Categories with Image Icons on Top & Name Below */}
          <div ref={bannerRef} className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
            <button onClick={() => { playSfx('click'); setActiveCat('All'); }} className="flex flex-col items-center shrink-0 group">
              <div className={`w-14 h-14 rounded-full overflow-hidden border-2 flex items-center justify-center bg-purple-800 ${activeCat === 'All' ? 'border-white scale-105 shadow-md' : 'border-purple-700 opacity-80'}`}>
                <Coffee className="w-6 h-6 text-purple-200" />
              </div>
              <span className={`text-xs font-bold mt-1 ${activeCat === 'All' ? 'text-white' : 'text-purple-300'}`}>All</span>
            </button>
            {cats.filter(c => c !== 'All').map(c => {
              const catImg = catImages[c];
              return (
                <button key={c} onClick={() => { playSfx('click'); setActiveCat(c); }} className="flex flex-col items-center shrink-0 group">
                  <div className={`w-14 h-14 rounded-full overflow-hidden border-2 flex items-center justify-center bg-purple-800 ${activeCat === c ? 'border-white scale-105 shadow-md' : 'border-purple-700 opacity-80'}`}>
                    {catImg ? <img src={catImg} alt={c} className="w-full h-full object-cover" /> : <Utensils className="w-6 h-6 text-purple-200" />}
                  </div>
                  <span className={`text-xs font-bold mt-1 whitespace-nowrap ${activeCat === c ? 'text-white' : 'text-purple-300'}`}>{c}</span>
                </button>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 bg-slate-100">
          {/* Banner Image / Default Banner */}
          {banner ? (
            <div className="w-full h-36 rounded-3xl overflow-hidden mb-5 shadow-lg relative shrink-0">
              <img src={banner} alt="Banner" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`w-full rounded-3xl bg-gradient-to-r ${defaultBanner.bg} text-white p-5 mb-5 shadow-lg relative overflow-hidden shrink-0`}>
              <h2 className="text-xl font-black mb-1">{defaultBanner.title}</h2>
              <p className="text-xs text-purple-200 font-medium">{defaultBanner.desc}</p>
            </div>
          )}

          {status === 'Verifying' && <PaymentTimer order={tableOrder} />}
          {status === 'Pending' && <div className="bg-purple-100 border-l-4 border-purple-600 text-purple-900 p-4 rounded-2xl mb-4 shadow-sm"><p className="font-black text-lg">Order Placed!</p><p className="text-sm opacity-80">Waiting for restaurant confirmation.</p></div>}
          {status === 'Preparing' && <div className="bg-blue-100 border-l-4 border-blue-600 text-blue-900 p-4 rounded-2xl mb-4 shadow-sm"><p className="font-black text-lg">Preparing Order 👨‍🍳</p><p className="text-sm opacity-80">Kitchen is cooking your delicious meal.</p></div>}
          {status === 'Ready' && <div className="bg-green-100 border-l-4 border-green-600 text-green-900 p-4 rounded-2xl mb-4 shadow-sm animate-bounce"><p className="font-black text-xl">Your Order is Ready! 🎉</p><p className="text-sm opacity-80">Please pick it up from the counter.</p></div>}
          {tableOrder && (status === 'Preparing' || status === 'Ready' || status === 'Completed') && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl mb-4 text-xs font-bold">
              ✅ Payment Verified! Successfully paid ₹{tableOrder.total} via {tableOrder.payment}.
            </div>
          )}

          <div className="space-y-3 pb-24">
            {displayedMenu.filter(i => i.stock).map(it => (
              <div key={it.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex gap-3">
                <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">{it.img ? <img src={it.img} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-300" />}</div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight">{it.name}</h3>
                    {it.desc && <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{it.desc}</p>}
                    
                    {/* Size Variants Display */}
                    {it.v && it.v.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {it.v.map((x, i) => (
                          <button key={i} onClick={() => addVariant(it, x[0], x[1])} className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 active:scale-95 flex flex-col items-start">
                            <span className="text-[10px] text-purple-500 uppercase">{x[0]}</span>
                            <span>₹{x[1]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!it.v && (
                    <div className="flex justify-between items-end mt-1">
                      <span className="font-black text-purple-700 text-lg">₹{it.price}</span>
                      <button onClick={() => addSimple(it)} className="bg-purple-100 text-purple-800 px-4 py-1.5 rounded-xl text-xs font-bold active:scale-95 hover:bg-purple-200">Add +</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        {count > 0 && !checkout && (
          <div className="absolute bottom-0 left-0 right-0 bg-white px-4 pt-3 pb-6 shadow-[0_-10px_30px_-10px_rgba(88,28,135,0.3)] rounded-t-[1.5rem] z-20">
            <button onClick={() => { playSfx('click'); setCheckout(true); }} className="w-full bg-purple-800 text-white font-bold py-4 rounded-2xl flex items-center justify-between px-6 shadow-xl active:scale-95 transition-transform"><div className="flex flex-col items-start leading-tight"><span className="text-xs text-purple-300">{count} items</span><span className="font-black text-xl">₹{total}</span></div><span className="bg-white/20 px-4 py-2 rounded-xl">Checkout</span></button>
          </div>
        )}

        {checkout && (
          <div className="absolute inset-0 bg-purple-950/80 backdrop-blur-sm z-30 flex items-end">
            <div className="bg-white w-full rounded-t-[2.5rem] p-6 pb-8 shadow-2xl max-h-[90%] overflow-y-auto">
              <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-black text-slate-900">Your Order</h3><button onClick={() => { playSfx('click'); setCheckout(false); }} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button></div>
              
              <div className="bg-purple-50 p-4 rounded-3xl mb-5 border border-purple-100 shadow-inner">
                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-purple-600 uppercase">Subtotal</span><span className="font-bold text-slate-700">₹{rawTotal}</span></div>
                {selectedCoupon && <div className="flex justify-between items-center mb-2 text-emerald-600 text-sm font-bold"><span>Discount ({selectedCoupon.code} - {selectedCoupon.discount}%)</span><span>-₹{discountAmount}</span></div>}
                <div className="flex justify-between items-center pt-2 border-t border-purple-200"><span className="text-xs font-bold text-purple-600 uppercase">Final Total</span><span className="text-3xl font-black text-purple-900">₹{total}</span></div>
                
                <div className="space-y-3 max-h-36 overflow-y-auto pr-2 mt-4 pt-3 border-t border-purple-200">{cart.map(c => <div key={c.key} className="flex items-center justify-between text-xs text-slate-700 font-bold border-b border-purple-100/50 pb-1.5"><span className="flex-1">{c.name}</span><div className="flex items-center gap-1.5 mx-2"><button onClick={() => chg(c.key, -1)} className="px-1.5 bg-white rounded shadow-sm">-</button><span>{c.qty}</span><button onClick={() => chg(c.key, 1)} className="px-1.5 bg-white rounded shadow-sm">+</button></div><span className="w-10 text-right">₹{c.price * c.qty}</span></div>)}</div>
              </div>

              {/* Coupons Section */}
              <div className="mb-5">
                <p className="font-bold text-slate-500 text-xs mb-2 uppercase tracking-widest flex items-center gap-1"><Tag className="w-3.5 h-3.5"/> Available Coupons / Offers</p>
                {coupons.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {coupons.map(c => (
                      <button key={c.id} onClick={() => applyCoupon(c)} className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${selectedCoupon?.id === c.id ? 'bg-purple-700 text-white border-purple-700' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                        <span>{c.code} ({c.discount}% OFF)</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-400 italic mb-2">No special coupons active right now.</p>}

                <div className="flex gap-2">
                  <input type="text" placeholder="Enter coupon code" value={couponCodeInput} onChange={e => setCouponCodeInput(e.target.value)} className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:border-purple-600" />
                  <button onClick={verifyCouponCode} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold">Apply</button>
                </div>
                {couponError && <p className="text-red-500 text-xs font-bold mt-1">{couponError}</p>}
              </div>

              <p className="font-bold text-slate-400 text-xs mb-3 uppercase tracking-widest">Select Payment</p>
              <div className="space-y-3">
                <button onClick={() => { playSfx('click'); onPlaceOrder(tableNumber, cart, total, 'Online', customerName, customerPhone, discountAmount); setCart([]); setCheckout(false); }} className="w-full flex items-center p-4 border-2 border-purple-200 rounded-2xl bg-white hover:bg-purple-50 transition-colors"><div className="bg-purple-100 p-3 rounded-xl text-purple-700 mr-4"><CreditCard className="w-6 h-6" /></div><div><h4 className="font-bold text-slate-800 text-lg">Pay via UPI / GPay</h4><p className="text-xs text-slate-500 font-medium">Fast & secure online payment</p></div></button>
                <button onClick={() => { playSfx('click'); onPlaceOrder(tableNumber, cart, total, 'Cash', customerName, customerPhone, discountAmount); setCart([]); setCheckout(false); }} className="w-full flex items-center p-4 border-2 border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-colors"><div className="bg-slate-100 p-3 rounded-xl text-slate-600 mr-4"><Banknote className="w-6 h-6" /></div><div><h4 className="font-bold text-slate-800 text-lg">Cash on Delivery</h4><p className="text-xs text-slate-500 font-medium">Pay directly to the waiter</p></div></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentTimer({ order }) {
  const [tl, setTl] = useState(180);
  useEffect(() => {
    window.location.href = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(CAFE_NAME)}&am=${order.total}.00&cu=INR&tn=${encodeURIComponent('Table ' + order.table)}`;
    const t = setInterval(() => setTl(p => p <= 1 ? (clearInterval(t), 0) : p - 1), 1000); return () => clearInterval(t);
  }, [order]);
  return (
    <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-indigo-100 text-center mb-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100"><div className="h-full bg-indigo-600 transition-all duration-1000 linear" style={{ width: `${(tl / 180) * 100}%` }}></div></div>
      <Clock className="w-10 h-10 text-indigo-600 mx-auto mb-3 animate-pulse" /><h3 className="text-xl font-black text-slate-800 mb-1">Verify Payment in App</h3><p className="text-sm text-slate-500 font-medium mb-4">Please complete the payment on your UPI app. The restaurant is waiting to confirm.</p>
      <div className="text-5xl font-black text-indigo-700 tabular-nums mb-4 drop-shadow-md">{String(Math.floor(tl / 60)).padStart(2, '0')}:{String(tl % 60).padStart(2, '0')}</div>
      {tl === 0 && <p className="text-red-500 font-bold text-sm bg-red-50 py-2 rounded-lg">Time expired. Please try ordering again or pay by cash.</p>}
    </div>
  );
}

/* ---------------- FULL ADMIN DASHBOARD ---------------- */
function AdminDashboard(p) {
  const [tab, setTab] = useState('orders');
  
  const pendingOrders = p.activeOrders.filter(o => o.status === 'Verifying' || o.status === 'Pending');
  
  useEffect(() => {
    if (pendingOrders.length === 0) return;
    
    playSfx('ring');
    const firstOrder = pendingOrders[0];
    if (firstOrder.payment === 'Online') {
      speak(`New online payment received for Table ${firstOrder.table}. Please accept.`);
    } else {
      speak(`New Cash on Delivery order for Table ${firstOrder.table}. Please accept.`);
    }

    const interval = setInterval(() => {
      if (pendingOrders.length > 0) {
        playSfx('ring');
        const ord = pendingOrders[0];
        speak(`Reminder! Unaccepted order for Table ${ord.table}. Please accept.`);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [pendingOrders.length]);

  const updateStatus = async (id, st) => {
    playSfx('click');
    if (st === 'Completed') {
      await p.completeOrder(p.activeOrders.find(o => o.id === id));
    } else {
      await updateDoc(doc(p.db, 'orders', id), { status: st });
    }
  };
  
  const [soundEnabled, setSoundEnabled] = useState(SOUND_ENABLED);
  const [voiceEnabled, setVoiceEnabled] = useState(VOICE_ENABLED);
  
  const toggleSound = () => { const s = !soundEnabled; setSoundEnabled(s); SOUND_ENABLED = s; playSfx('click'); };
  const toggleVoice = () => { const v = !voiceEnabled; setVoiceEnabled(v); VOICE_ENABLED = v; playSfx('click'); if(v) speak('Voice alerts enabled'); };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <aside className="w-20 md:w-64 bg-purple-950 text-purple-300 flex flex-col shadow-2xl z-20 shrink-0">
        <div className="p-4 md:p-6 flex items-center gap-3 border-b border-purple-900/50"><div className="bg-purple-600 p-2 rounded-xl text-white"><LayoutDashboard className="w-6 h-6" /></div><span className="font-black text-xl hidden md:block text-white">Admin Hub</span></div>
        <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto">
          <SideBtn icon={<Bell />} label="Live Orders" active={tab === 'orders'} onClick={() => { playSfx('click'); setTab('orders'); }} badge={p.activeOrders.filter(o => o.status === 'Verifying' || o.status === 'Pending').length} />
          <SideBtn icon={<Utensils />} label="Menu Manager" active={tab === 'menu'} onClick={() => { playSfx('click'); setTab('menu'); }} />
          <SideBtn icon={<Package />} label="Inventory" active={tab === 'inventory'} onClick={() => { playSfx('click'); setTab('inventory'); }} />
          <SideBtn icon={<Tag />} label="Coupons" active={tab === 'coupons'} onClick={() => { playSfx('click'); setTab('coupons'); }} />
          <SideBtn icon={<QrCode />} label="Table & QR" active={tab === 'qr'} onClick={() => { playSfx('click'); setTab('qr'); }} />
          <SideBtn icon={<History />} label="Revenue & P/L" active={tab === 'history'} onClick={() => { playSfx('click'); setTab('history'); }} />
          <SideBtn icon={<Settings />} label="Settings" active={tab === 'settings'} onClick={() => { playSfx('click'); setTab('settings'); }} />
        </nav>
        <div className="p-4 border-t border-purple-900/50"><button onClick={() => { playSfx('click'); p.onExit(); }} className="flex items-center justify-center md:justify-start gap-3 w-full p-3 rounded-xl hover:bg-purple-900 hover:text-white transition-colors"><LogOut className="w-5 h-5" /><span className="font-bold hidden md:block">Logout</span></button></div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white px-5 md:px-8 py-4 flex justify-between items-center shadow-sm border-b border-slate-200 gap-4 shrink-0">
          <h1 className="text-lg md:text-2xl font-black text-purple-950 capitalize truncate">{tab.replace('qr', 'Table & QR').replace('history', 'Revenue & Profit/Loss')}</h1>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={toggleSound} className={`p-2.5 rounded-xl transition-colors ${soundEnabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>{soundEnabled ? <Volume2 className="w-5 h-5"/> : <VolumeX className="w-5 h-5"/>}</button>
            <button onClick={toggleVoice} className={`p-2.5 rounded-xl transition-colors ${voiceEnabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}><Mic className="w-5 h-5"/></button>
            <div className="bg-purple-100 text-purple-800 px-4 py-2.5 rounded-xl font-bold hidden md:flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {tab === 'orders' && <OrdersBoard orders={p.activeOrders} updateStatus={updateStatus} cancelOrder={p.cancelOrder} />}
          {tab === 'menu' && <MenuTab menuItems={p.menuItems} db={p.db} />}
          {tab === 'inventory' && <InventoryTab stockInv={p.stockInv} iceInv={p.iceInv} db={p.db} />}
          {tab === 'coupons' && <CouponsTab coupons={p.coupons} db={p.db} />}
          {tab === 'qr' && <QRTab logo={p.cafeLogo} />}
          {tab === 'history' && <HistoryTab history={p.orderHistory} stockInv={p.stockInv} iceInv={p.iceInv} menuItems={p.menuItems} db={p.db} />}
          {tab === 'settings' && <SettingsTab logo={p.cafeLogo} banner={p.customBanner} catImages={p.categoryImages} db={p.db} />}
        </div>
      </main>
    </div>
  );
}

function SideBtn({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-center md:justify-start gap-3 p-3.5 rounded-xl transition-all ${active ? 'bg-purple-700 text-white shadow-lg' : 'hover:bg-purple-900/50 hover:text-white text-purple-200'}`}>
      <div className="relative">{icon}{badge > 0 && <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full md:hidden">{badge}</span>}</div>
      <span className="font-bold hidden md:block text-left flex-1">{label}</span>{badge > 0 && <span className="hidden md:flex bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );
}

/* ---------------- 4-COLUMN ORDERS BOARD ---------------- */
function OrdersBoard({ orders, updateStatus, cancelOrder }) {
  const col = (s) => orders.filter(o => o.status === s);
  return (
    <div className="flex gap-4 h-full min-w-max pb-4 overflow-x-auto">
      <AdminCol title="Verify Payment" icon={<CreditCard />} list={col('Verifying')} bg="bg-indigo-50" text="text-indigo-900" action="Payment Received & Accept" color="bg-indigo-600" onAction={(id) => updateStatus(id, 'Pending')} onCancel={cancelOrder} />
      <AdminCol title="New Orders" icon={<Bell />} list={col('Pending')} bg="bg-purple-50" text="text-purple-900" action="Accept & Prep" color="bg-purple-600" onAction={(id) => updateStatus(id, 'Preparing')} onCancel={cancelOrder} blink />
      <AdminCol title="In Kitchen" icon={<ChefHat />} list={col('Preparing')} bg="bg-amber-50" text="text-amber-900" action="Mark as Ready" color="bg-amber-500" onAction={(id) => updateStatus(id, 'Ready')} onCancel={cancelOrder} />
      <AdminCol title="Ready to Serve" icon={<CheckCircle />} list={col('Ready')} bg="bg-green-50" text="text-green-900" action="Complete & Send Bill" color="bg-green-600" onAction={(id) => updateStatus(id, 'Completed')} onCancel={cancelOrder} />
    </div>
  );
}
function AdminCol({ title, icon, list, bg, text, action, color, onAction, onCancel, blink }) {
  return (
    <div className="w-80 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
      <div className={`${bg} px-5 py-4 border-b border-slate-200 flex justify-between items-center`}><h3 className={`font-black flex items-center gap-2 ${text}`}><span className="opacity-80">{icon}</span> {title}</h3><span className={`bg-white ${text} text-xs font-black px-3 py-1.5 rounded-lg border shadow-sm`}>{list.length}</span></div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-50/30">
        {list.length === 0 && <div className="text-slate-400 text-center py-10 text-sm font-bold border-2 border-dashed border-slate-200 rounded-2xl">Empty</div>}
        {list.map(o => (
          <div key={o.id} className={`bg-white p-5 rounded-2xl shadow-sm border-2 ${blink ? 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-slate-100'}`}>
            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
              <div><h4 className="text-xl font-black text-slate-900">Table {o.table}</h4><p className="text-xs font-bold text-purple-700">{o.customerName || 'Guest'} ({o.customerPhone || 'N/A'})</p><span className="text-xs text-slate-400 font-mono font-bold">#{o.id}</span></div>
              <div className="text-xl font-black text-purple-700">₹{o.total}</div>
            </div>
            <div className="mb-4 space-y-1.5">{o.items.map((it, i) => <div key={i} className="flex gap-2 text-sm text-slate-700 font-bold"><span className="bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded-md">{it.qty}x</span><span>{it.name}</span></div>)}
              <div className="pt-3 mt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-xs font-black uppercase"><span className="text-slate-500">Method:</span><span className={`px-2 py-1 rounded-md ${o.payment === 'Online' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{o.payment}</span></div>
            </div>
            <div className="flex gap-2 mt-2"><button onClick={() => onAction(o.id)} className={`flex-1 py-3 rounded-xl font-black text-white shadow-md active:scale-95 transition-transform text-sm ${color}`}>{action}</button><DelBtn onDel={() => onCancel(o.id)} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- COUPONS MANAGEMENT TAB ---------------- */
function CouponsTab({ coupons, db }) {
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState(10);

  const addCoupon = async (e) => {
    e.preventDefault();
    if (!code.trim()) return playSfx('error');
    playSfx('save');
    await setDoc(doc(db, 'coupons', 'c_' + Date.now()), { code: code.trim().toUpperCase(), discount: Number(discount) });
    setCode(''); setDiscount(10);
  };

  const deleteCoupon = async (id) => { playSfx('del'); await deleteDoc(doc(db, 'coupons', id)); };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 max-w-xl">
      <h2 className="text-xl font-black text-slate-900 mb-4">Manage Discount Coupons</h2>
      <form onSubmit={addCoupon} className="space-y-4 mb-6 bg-slate-50 p-4 rounded-2xl border">
        <div><label className="text-xs font-bold text-slate-500 uppercase">Coupon Code</label><input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. SPECIAL10" className={inpStyle} required /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase">Discount Percentage (%)</label><input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className={inpStyle} required min={1} max={100} /></div>
        <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-3 rounded-xl">Add Coupon</button>
      </form>
      <div className="space-y-2">
        {coupons.map(c => (
          <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border">
            <div><p className="font-black text-purple-900">{c.code}</p><p className="text-xs font-bold text-slate-500">{c.discount}% OFF on total bill</p></div>
            <DelBtn onDel={() => deleteCoupon(c.id)} />
          </div>
        ))}
        {coupons.length === 0 && <p className="text-center text-slate-400 font-bold text-sm">No active coupons.</p>}
      </div>
    </div>
  );
}

/* ---------------- MENU CRUD TAB WITH ADJUSTED BUTTON ---------------- */
function MenuTab({ menuItems, db }) {
  const [edit, setEdit] = useState(undefined);
  const [search, setSearch] = useState('');

  const filteredMenu = useMemo(() => {
    return menuItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));
  }, [menuItems, search]);

  const save = async (item) => {
    playSfx('save');
    if (edit && edit.id) {
      await updateDoc(doc(db, 'eternal_menu_v2', edit.id), item);
    } else {
      await setDoc(doc(db, 'eternal_menu_v2', 'm' + Date.now()), item);
    }
    setEdit(undefined);
  };
  const toggleStock = async (it) => {
    playSfx('click');
    await updateDoc(doc(db, 'eternal_menu_v2', it.id), { stock: !it.stock });
  };
  const deleteItem = async (id) => {
    playSfx('del');
    await deleteDoc(doc(db, 'eternal_menu_v2', id));
  };

  const categories = [...new Set(menuItems.map(i => i.category).filter(Boolean))];
  const descriptions = [...new Set(menuItems.map(i => i.desc).filter(Boolean))];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 md:p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 bg-slate-50">
        <h2 className="text-lg md:text-xl font-black text-slate-800">Menu Catalog ({menuItems.length})</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm font-bold outline-none focus:border-purple-600" />
          </div>
          <button onClick={() => { playSfx('click'); setEdit({ name: '', category: 'Pizza', price: 100, desc: '', v: null, ingredients: [], stock: true }); }} className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 text-sm shrink-0"><Plus className="w-4 h-4" /> Add Menu</button>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left min-w-[700px]">
        <thead><tr className="bg-slate-100 text-slate-500 text-xs uppercase border-b"><th className="p-3 pl-6">Img</th><th className="p-3">Name / Category</th><th className="p-3">Price</th><th className="p-3">Hidden Cost (Profit Calc)</th><th className="p-3">Status</th><th className="p-3 pr-6 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filteredMenu.map(it => {
          const totalIngCost = (it.ingredients || []).reduce((s, ing) => s + Number(ing.cost || 0), 0);
          const basePrice = it.v ? it.v[0][1] : it.price;
          const profit = basePrice - totalIngCost;
          return (
            <tr key={it.id} className="hover:bg-slate-50">
              <td className="p-3 pl-6"><div className="w-10 h-10 bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center">{it.img ? <img src={it.img} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-slate-400" />}</div></td>
              <td className="p-3"><p className="font-bold text-slate-900 text-sm">{it.name}</p><p className="text-[11px] text-slate-500">{it.category}</p></td>
              <td className="p-3 font-black text-purple-700 text-sm">₹{it.v ? it.v.map(x => `${x[0]}: ₹${x[1]}`).join(', ') : it.price}</td>
              <td className="p-3 text-xs font-bold text-slate-600">Cost: ₹{totalIngCost} | <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>Profit: ₹{profit}</span></td>
              <td className="p-3"><button onClick={() => toggleStock(it)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${it.stock ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{it.stock ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}{it.stock ? 'In Stock' : 'Out'}</button></td>
              <td className="p-3 pr-6 text-right"><div className="flex justify-end gap-1.5"><button onClick={() => { playSfx('click'); setEdit(it); }} className="p-2 text-slate-400 hover:text-purple-700 bg-slate-50 rounded-xl"><Edit className="w-4 h-4" /></button><DelBtn onDel={() => deleteItem(it.id)} /></div></td>
            </tr>
          );
        })}</tbody>
      </table></div>
      {edit !== undefined && <MenuForm item={edit} categories={categories} descriptions={descriptions} onSave={save} onClose={() => setEdit(undefined)} />}
    </div>
  );
}

function MenuForm({ item, categories, descriptions, onSave, onClose }) {
  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState(item?.category || 'Pizza');
  const [price, setPrice] = useState(item?.price || 100);
  const [desc, setDesc] = useState(item?.desc || '');
  const [hasVariants, setHasVariants] = useState(!!item?.v);
  const [variantSize, setVariantSize] = useState('Small');
  const [variantPrice, setVariantPrice] = useState(100);
  const [variantList, setVariantList] = useState(item?.v || []);
  const [ingredients, setIngredients] = useState(item?.ingredients || [{ name: '', cost: '' }]);
  const [img, setImg] = useState(item?.img || '');
  const fileRef = useRef(null);

  const addVariantItem = () => {
    if (!variantSize || isNaN(variantPrice)) return;
    setVariantList([...variantList, [variantSize, Number(variantPrice)]]);
    setVariantPrice(100);
  };

  const removeVariantItem = (idx) => {
    setVariantList(variantList.filter((_, i) => i !== idx));
  };

  const addIngredient = () => setIngredients([...ingredients, { name: '', cost: '' }]);
  const updateIngredient = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };
  const removeIngredient = (index) => setIngredients(ingredients.filter((_, i) => i !== index));

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return playSfx('error');
    if (!hasVariants && isNaN(price)) return playSfx('error');

    const cleanIngredients = ingredients.filter(i => i.name.trim() && !isNaN(i.cost)).map(i => ({ name: i.name.trim(), cost: Number(i.cost) }));

    onSave({
      name: name.trim(),
      category: category.trim(),
      desc: desc.trim(),
      img,
      price: hasVariants && variantList.length > 0 ? variantList[0][1] : Number(price),
      v: hasVariants && variantList.length > 0 ? variantList : null,
      ingredients: cleanIngredients,
      stock: item ? item.stock : true
    });
  };

  return (
    <Modal title={item?.id ? 'Edit Menu Item' : 'New Menu Item'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
        <div><label className="text-xs font-bold text-slate-500 uppercase">Item Name</label><input value={name} onChange={e => setName(e.target.value)} className={inpStyle} required /></div>
        
        <div className="grid grid-cols-2 gap-3">
          {!hasVariants && <div><label className="text-xs font-bold text-slate-500 uppercase">Price (₹)</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} className={inpStyle} required /></div>}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
            <input list="cat-list" value={category} onChange={e => setCategory(e.target.value)} className={inpStyle} required />
            <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-purple-50 p-3 rounded-xl border border-purple-100">
          <input type="checkbox" id="hasVar" checked={hasVariants} onChange={e => setHasVariants(e.target.checked)} className="w-4 h-4 accent-purple-600" />
          <label htmlFor="hasVar" className="text-xs font-bold text-purple-900 cursor-pointer">Has Size Variants?</label>
        </div>

        {hasVariants && (
          <div className="bg-slate-50 p-3 rounded-2xl border space-y-3">
            <label className="text-xs font-black text-slate-700 uppercase">Add Size & Price</label>
            <div className="flex gap-2">
              <select value={variantSize} onChange={e => setVariantSize(e.target.value)} className="border rounded-xl px-3 py-2 text-xs font-bold bg-white">
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="Half">Half</option>
                <option value="Full">Full</option>
                <option value="Regular">Regular</option>
              </select>
              <input type="number" value={variantPrice} onChange={e => setVariantPrice(e.target.value)} placeholder="Price (₹)" className="flex-1 border rounded-xl px-3 py-2 text-xs font-bold bg-white" />
              <button type="button" onClick={addVariantItem} className="bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {variantList.map((v, i) => (
                <div key={i} className="bg-purple-100 text-purple-900 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                  <span>{v[0]}: ₹{v[1]}</span>
                  <button type="button" onClick={() => removeVariantItem(i)} className="text-red-500 font-bold">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Description (Optional)</label>
          <input list="desc-list" value={desc} onChange={e => setDesc(e.target.value)} className={inpStyle} />
          <datalist id="desc-list">{descriptions.map(d => <option key={d} value={d} />)}</datalist>
        </div>

        {/* Hidden Ingredients for Profit Calculation */}
        <div className="border-t pt-3">
          <div className="flex justify-between items-center mb-2"><label className="text-xs font-black text-purple-900 uppercase">Hidden Ingredients / Cost (Admin Only)</label><button type="button" onClick={addIngredient} className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg font-bold">+ Add</button></div>
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input type="text" placeholder="Ingredient Name" value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
              <input type="number" placeholder="Cost (₹)" value={ing.cost} onChange={e => updateIngredient(idx, 'cost', e.target.value)} className="w-24 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
              {ingredients.length > 1 && <button type="button" onClick={() => removeIngredient(idx)} className="text-red-500 p-1"><X className="w-4 h-4"/></button>}
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Photo (Optional)</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files[0]) { playSfx('save'); setImg(await readImg(e.target.files[0])); } }} />
          <div className="flex gap-3 items-center mt-1"><div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden flex justify-center items-center">{img ? <img src={img} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-300" />}</div><button type="button" onClick={() => { playSfx('click'); fileRef.current.click(); }} className="bg-purple-100 text-purple-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"><Upload className="w-3.5 h-3.5"/> Upload</button></div>
        </div>

        <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-4 rounded-xl mt-4">Save Menu Item</button>
      </form>
    </Modal>
  );
}

/* ---------------- INVENTORY TAB ---------------- */
function InventoryTab({ stockInv, iceInv, db }) {
  const [search, setSearch] = useState('');
  const stockLows = stockInv.filter(i => i.qty <= i.min);
  const iceLows = iceInv.filter(i => i.qty <= i.min);

  return (
    <div className="space-y-6">
      {stockLows.length > 0 && <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 font-bold text-sm flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0"/>{stockLows.map(l => `${l.name} is low`).join('. ')}</div>}
      {iceLows.length > 0 && <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-2xl p-4 font-bold text-sm flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0"/>Ice Cream Low: {iceLows.map(l => l.name).join(', ')}</div>}
      
      <div className="bg-white rounded-3xl border border-slate-200 p-4 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
        <input type="text" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="w-full font-bold outline-none text-slate-800 text-sm" />
      </div>

      <InvSection title="Ice Cream Inventory" icon={<IceCream className="w-5 h-5"/>} items={iceInv} colName="icecream" db={db} prefix="ic" search={search} />
      <InvSection title="Stock Inventory" icon={<Package className="w-5 h-5"/>} items={stockInv} colName="stock" db={db} prefix="i" search={search} />
    </div>
  );
}

function InvSection({ title, icon, items, colName, db, prefix, search }) {
  const [edit, setEdit] = useState(undefined);

  const filteredItems = useMemo(() => {
    return items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const upd = async (id, qty, d) => {
    playSfx(d > 0 ? 'add' : 'remove');
    await updateDoc(doc(db, colName, id), { qty: Math.max(0, qty + d) });
  };

  const save = (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const qty = Number(form.qty.value);
    const price = Number(form.price.value || 0);
    const min = Number(form.min.value || 10);

    if (!name) return playSfx('error');
    playSfx('save');
    const data = { name, qty, price, min };

    if (edit && edit.id) {
      updateDoc(doc(db, colName, edit.id), data);
    } else {
      setDoc(doc(db, colName, prefix + Date.now()), data);
    }
    setEdit(undefined);
  };

  const deleteInv = async (id) => { playSfx('del'); await deleteDoc(doc(db, colName, id)); };

  const names = [...new Set(items.map(i => i.name).filter(Boolean))];
  
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 md:p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 gap-3">
        <h2 className="text-base md:text-xl font-black text-slate-800 flex items-center gap-2 truncate">{icon} {title}</h2>
        <button onClick={() => { playSfx('click'); setEdit({ name: '', qty: 0, price: 0, min: 10 }); }} className="bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold flex gap-1.5 items-center text-xs md:text-sm shrink-0"><Plus className="w-4 h-4" /> Add Item</button>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left min-w-[500px]">
        <thead className="bg-slate-100 text-slate-500 text-xs uppercase"><tr><th className="p-3 pl-6">Item</th><th className="p-3">Qty</th><th className="p-3">Expense (₹)</th><th className="p-3">Alert At</th><th className="p-3 text-right pr-6">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filteredItems.map(i => (
          <tr key={i.id} className={i.qty <= i.min ? 'bg-red-50/60' : ''}>
            <td className="p-3 pl-6 font-bold text-sm">{i.name}</td>
            <td className="p-3"><div className="flex items-center gap-1.5"><button onClick={() => upd(i.id, i.qty, -1)} className="p-1 bg-slate-100 rounded-lg"><Minus className="w-3.5 h-3.5"/></button><span className="font-black w-10 text-center text-sm">{i.qty}</span><button onClick={() => upd(i.id, i.qty, 1)} className="p-1 bg-slate-100 rounded-lg"><Plus className="w-3.5 h-3.5"/></button></div></td>
            <td className="p-3 font-black text-purple-700 text-sm">₹{i.price || 0}</td>
            <td className="p-3 font-bold text-slate-500 text-sm">{i.min}</td>
            <td className="p-3 pr-6 text-right"><div className="flex justify-end gap-1.5"><button onClick={() => { playSfx('click'); setEdit(i); }} className="p-2 text-slate-400 bg-slate-50 rounded-xl hover:text-purple-700"><Edit className="w-4 h-4"/></button><DelBtn onDel={() => deleteInv(i.id)} /></div></td>
          </tr>
        ))}
        {filteredItems.length === 0 && <tr><td colSpan="5" className="p-8 text-center font-bold text-slate-400">Empty List</td></tr>}
        </tbody>
      </table></div>
      {edit !== undefined && (
        <Modal title={edit?.id ? 'Edit Item' : 'Add Item'} onClose={() => setEdit(undefined)}>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
              <input name="name" list={`name-list-${prefix}`} defaultValue={edit?.name} className={inpStyle} required />
              <datalist id={`name-list-${prefix}`}>{names.map(n => <option key={n} value={n} />)}</datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Quantity</label><input name="qty" type="number" defaultValue={edit?.qty ?? 0} className={inpStyle} required /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Expense (₹)</label><input name="price" type="number" defaultValue={edit?.price ?? 0} className={inpStyle} required /></div>
            </div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Low Alert Limit</label><input name="min" type="number" defaultValue={edit?.min ?? 10} className={inpStyle} required /></div>
            <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-4 rounded-xl mt-2">Save Item</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- JPG QR CARD GENERATOR ---------------- */
function QRTab({ logo }) {
  const [link, setLink] = useState('');
  const [tbl, setTbl] = useState('');
  const [cardData, setCardData] = useState(null);
  const cardRef = useRef(null);

  const generate = () => {
    if (!link.trim() || !tbl.trim()) return playSfx('error');
    playSfx('save');
    setCardData({ link: link.trim(), tbl: tbl.trim() });
  };

  const downloadJPG = () => {
    if (!cardData || !cardRef.current) return;
    playSfx('click');
    const node = cardRef.current;
    import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js').then(() => {
      window.html2canvas(node, { scale: 3, useCORS: true }).then(canvas => {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/jpeg', 1.0);
        a.download = `Table_${cardData.tbl}_QR_Card.jpg`;
        a.click();
      });
    }).catch(() => {
      window.print();
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <div className="w-full md:w-1/2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="font-black text-2xl text-purple-950 mb-4 flex items-center gap-2"><QrCode/> Create QR Card</h2>
        <div className="space-y-4">
          <div><label className="text-xs font-bold text-slate-500 uppercase">1. Insert Website Link</label><input type="text" placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} className={inpStyle} /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">2. Enter Table Number</label><input type="text" inputMode="numeric" placeholder="e.g. 5" value={tbl} onChange={e => setTbl(e.target.value)} className={inpStyle} /></div>
          <button onClick={generate} className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-4 rounded-xl">Generate Card View</button>
        </div>
      </div>
      
      {cardData && (
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 bg-slate-200/50 rounded-3xl border-2 border-dashed border-slate-300">
          <div ref={cardRef} className="w-[340px] bg-white rounded-[36px] overflow-hidden shadow-2xl text-center pb-8 border border-slate-100">
            <div className="bg-[#7e22ce] text-white pt-8 pb-[80px] rounded-b-[45px]">
              {logo ? <img src={logo} className="w-12 h-12 rounded-full mx-auto mb-2 object-cover border-2 border-white" alt="logo" /> : <Coffee className="w-10 h-10 text-[#d8b4fe] mx-auto mb-2" />}
              <h1 className="text-4xl font-black m-0 leading-none">Table {cardData.tbl}</h1>
              <p className="text-[11px] font-black tracking-[0.25em] text-[#d8b4fe] mt-2">SCAN TO ORDER</p>
            </div>
            <div className="bg-white w-56 h-56 mx-auto -mt-16 rounded-3xl p-3 shadow-[0_10px_35px_rgba(0,0,0,0.18)] relative z-10 border border-slate-100">
              <img src={getQrUrl(cardData.link)} alt="QR" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-[#4c1d95] font-black text-xl mt-6 tracking-tight">{CAFE_NAME}</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">Good food travels better</p>
          </div>
          <button onClick={downloadJPG} className="mt-8 bg-purple-800 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-purple-900 active:scale-95"><Download className="w-5 h-5"/> Download JPG Image</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- REVENUE & PROFIT/LOSS SECTION ---------------- */
function HistoryTab({ history, stockInv, iceInv, menuItems, db }) {
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const rows = useMemo(() => history.filter(o => { const d = new Date(o.completedAt || o.time); const ymdStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return (!from || ymdStr >= from) && (!to || ymdStr <= to); }), [history, from, to]);
  
  const totalRevenue = rows.reduce((s, o) => s + o.total, 0);
  const totalStockExpense = stockInv.reduce((s, i) => s + (i.price || 0), 0);
  const totalIceExpense = iceInv.reduce((s, i) => s + (i.price || 0), 0);
  const totalExpense = totalStockExpense + totalIceExpense;
  const netProfitLoss = totalRevenue - totalExpense;

  const deleteHistory = async (id) => { playSfx('del'); await deleteDoc(doc(db, 'history', id)); };

  const dlCsv = () => {
    playSfx('save');
    let c = 'ID,Table,Customer Name,Phone,Date,Time,Payment,Total,Items\n' + rows.map(o => { const d = new Date(o.completedAt || o.time); return `${o.id},${o.table},"${o.customerName || ''}",${o.customerPhone || ''},${d.toLocaleDateString()},${d.toLocaleTimeString()},${o.payment},${o.total},"${o.items.map(i => `${i.qty}x${i.name}`).join('; ')}"`; }).join('\n');
    c += `\n,,,,,,TOTAL REVENUE,${totalRevenue},\n,,,,,,TOTAL EXPENSE,${totalExpense},\n,,,,,,NET PROFIT/LOSS,${netProfitLoss},`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv' })); a.download = `financial_report_${from || 'all'}_${to || 'all'}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 md:p-5 flex flex-wrap gap-4 items-end">
        <div><label className="text-xs font-bold text-slate-500 uppercase">From date</label><input type="date" value={from} onChange={e => { playSfx('click'); setFrom(e.target.value); }} className={inpStyle + ' py-2'} /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase">To date</label><input type="date" value={to} onChange={e => { playSfx('click'); setTo(e.target.value); }} className={inpStyle + ' py-2'} /></div>
        <button onClick={() => { playSfx('click'); setFrom(''); setTo(''); }} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200">Clear</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-purple-800 rounded-3xl p-5 text-white"><p className="text-purple-200 font-bold text-xs uppercase mb-1">Total Sales</p><h2 className="text-2xl font-black">₹{totalRevenue}</h2></div>
        <div className="bg-amber-600 rounded-3xl p-5 text-white"><p className="text-amber-100 font-bold text-xs uppercase mb-1">Total Expense</p><h2 className="text-2xl font-black">₹{totalExpense}</h2></div>
        <div className={`rounded-3xl p-5 text-white ${netProfitLoss >= 0 ? 'bg-green-600' : 'bg-red-600'}`}><p className="text-white/80 font-bold text-xs uppercase mb-1">Net Profit / Loss</p><h2 className="text-2xl font-black">₹{netProfitLoss}</h2></div>
        <div className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-col justify-center"><button onClick={dlCsv} disabled={!rows.length} className="bg-indigo-600 text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 text-xs"><Download className="w-4 h-4"/> Export Report</button></div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[750px]">
            <thead className="bg-slate-50 text-slate-400 text-xs uppercase">
              <tr>
                <th className="p-3 pl-6">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Table / Items</th>
                <th className="p-3">Pay Mode</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="p-3 pl-6 font-mono font-bold text-slate-600 text-sm">#{o.id}</td>
                  <td className="p-3 text-sm font-bold text-slate-800">{o.customerName || 'Guest'}<br/><span className="text-[11px] text-slate-400 font-mono">{o.customerPhone || 'N/A'}</span></td>
                  <td className="p-3 text-xs text-slate-500 whitespace-nowrap">{new Date(o.completedAt || o.time).toLocaleString()}</td>
                  <td className="p-3"><p className="font-bold text-sm">Table {o.table}</p><p className="text-[11px] text-slate-500">{o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</p></td>
                  <td className="p-3 whitespace-nowrap"><span className={`px-2 py-1 rounded-md text-[11px] font-bold ${o.payment === 'Online' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>{o.payment}</span></td>
                  <td className="p-3 font-black text-purple-700 text-right text-base whitespace-nowrap">₹{o.total}</td>
                  <td className="p-3 pr-6 text-right"><DelBtn onDel={() => deleteHistory(o.id)} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="7" className="p-8 text-center font-bold text-slate-400">No history found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SETTINGS TAB WITH BANNER & CATEGORY IMAGE UPLOAD ---------------- */
function SettingsTab({ logo, banner, catImages, db }) {
  const fileRef = useRef(null);
  const bannerRef = useRef(null);
  const catFileRef = useRef(null);
  const [selectedCat, setSelectedCat] = useState('Pizza');

  const saveLogo = async (url) => { playSfx('save'); await setDoc(doc(db, 'settings', 'config'), { logo: url, banner, catImages }, { merge: true }); };
  const saveBanner = async (url) => { playSfx('save'); await setDoc(doc(db, 'settings', 'config'), { logo, banner: url, catImages }, { merge: true }); };
  const saveCatImg = async (cat, url) => {
    playSfx('save');
    const updated = { ...catImages, [cat]: url };
    await setDoc(doc(db, 'settings', 'config'), { logo, banner, catImages: updated }, { merge: true });
  };

  const categories = ['Pizza', 'Garlic Bread', 'Pasta', 'Fries', 'Sandwich', 'Maggie', 'Panini', 'Burger', 'Momos', 'Frankie', 'Combos', 'Beverages', 'Waffles', 'Desserts', 'Scoop Ice Cream', 'Mocktails', 'Thick Shakes', 'Lattes'];

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <h2 className="text-2xl font-black text-slate-900 mb-6">Café Logo & Banner Settings</h2>
        <div className="space-y-6">
          <div className="flex flex-col items-center bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden mb-4 border-4 border-purple-100">
              {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover"/> : <Coffee className="w-10 h-10 text-purple-300" />}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files[0]) saveLogo(await readImg(e.target.files[0])); }} />
            <button onClick={() => { playSfx('click'); fileRef.current.click(); }} className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm shadow-md"><Upload className="w-4 h-4"/> Upload Logo</button>
          </div>

          <div className="flex flex-col items-center bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-full h-28 bg-white rounded-2xl shadow-md overflow-hidden mb-4 border-2 border-purple-100 flex items-center justify-center">
              {banner ? <img src={banner} alt="Banner" className="w-full h-full object-cover"/> : <span className="text-xs font-bold text-slate-400">Default Banner Active</span>}
            </div>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files[0]) saveBanner(await readImg(e.target.files[0])); }} />
            <button onClick={() => { playSfx('click'); bannerRef.current.click(); }} className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm shadow-md"><Upload className="w-4 h-4"/> Upload Banner Image</button>
            {banner && <button onClick={() => saveBanner('')} className="text-red-500 font-bold text-xs mt-3 hover:underline">Remove Custom Banner</button>}
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border space-y-4">
            <h3 className="font-black text-slate-800 text-sm">Category Circle Images</h3>
            <div className="flex gap-2">
              <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className={inpStyle + ' py-2 text-sm'}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input ref={catFileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files[0]) saveCatImg(selectedCat, await readImg(e.target.files[0])); }} />
              <button onClick={() => catFileRef.current.click()} className="bg-indigo-600 text-white font-bold px-4 rounded-xl text-xs shrink-0">Upload Icon</button>
            </div>
            {catImages[selectedCat] && <div className="w-16 h-16 rounded-full overflow-hidden border"><img src={catImages[selectedCat]} className="w-full h-full object-cover" /></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
