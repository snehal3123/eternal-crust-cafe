import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Coffee, Utensils, Plus, Minus, ChevronLeft, LayoutDashboard, LogOut,
  CheckCircle, Clock, ChefHat, Bell, Edit, Trash2, ToggleLeft, ToggleRight, QrCode, Printer,
  CreditCard, Banknote, X, History, Download, Image as ImageIcon, Package, AlertTriangle, Upload, IceCream, Lock, Eye, EyeOff, Settings, Volume2, VolumeX, Mic, Search
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
  const u = new SpeechSynthesisUtterance(txt);
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => /(female|samantha|zira|google us english|heera|veena)/i.test(v.name));
  if (femaleVoice) u.voice = femaleVoice;
  u.pitch = 1.1; u.rate = 0.95; u.volume = 1;
  window.speechSynthesis.speak(u);
};

/* ---------------- CONFIG & DATA ---------------- */
const UPI_ID = 'snehaltitkare58-2@okicici';
const CAFE_NAME = 'ETERNAL CRUST CAFÉ';

const getQrUrl = (url) => `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&color=6b21a8&data=${encodeURIComponent(url)}`;

const readImg = (f) => new Promise((res) => {
  const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); const s = Math.min(1, 600 / Math.max(im.width, im.height)); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); }; im.src = r.result; }; r.readAsDataURL(f);
});

const initialMenu = [
  { id: 'p1', category: 'Pizza', name: 'Small Pizza', price: 139, stock: true },
  { id: 'p2', category: 'Pizza', name: 'Classic Margarita Pizza', price: 149, v: [['Regular', 149], ['Large', 189]], stock: true },
  { id: 'p3', category: 'Pizza', name: 'Paneer Mushroom Pizza', price: 169, v: [['Regular', 169], ['Large', 189]], stock: true },
  { id: 'p4', category: 'Pizza', name: 'Cheese Chilli Pizza', price: 169, v: [['Regular', 169], ['Large', 199]], stock: true },
  { id: 'p5', category: 'Pizza', name: 'Hot Garlic Pizza', price: 169, v: [['Regular', 169], ['Large', 199]], stock: true },
  { id: 'p6', category: 'Pizza', name: 'Vegetable Delight Pizza', price: 179, v: [['Regular', 179], ['Large', 209]], stock: true },
  { id: 'p7', category: 'Pizza', name: 'Veg Crispy Corn Pizza', price: 179, v: [['Regular', 179], ['Large', 209]], stock: true },
  { id: 'p8', category: 'Pizza', name: 'Tandoori Paneer Tikka Pizza', price: 199, v: [['Regular', 199], ['Large', 229]], stock: true },
  { id: 'p9', category: 'Pizza', name: 'Paneer Makhani Pizza', price: 199, v: [['Regular', 199], ['Large', 229]], stock: true },
  { id: 'p10', category: 'Pizza', name: 'Vegetable Tandoor Pizza', price: 199, v: [['Regular', 199], ['Large', 219]], stock: true },
  { id: 'p11', category: 'Pizza', name: 'BBQ Paneer Pizza', price: 209, v: [['Regular', 209], ['Large', 239]], stock: true },
  { id: 'p12', category: 'Pizza', name: 'Eternal Crust Special Pizza', price: 219, v: [['Regular', 219], ['Large', 249]], stock: true },

  { id: 'gb1', category: 'Garlic Bread', name: 'Classic Garlic Bread', price: 99, stock: true },
  { id: 'gb2', category: 'Garlic Bread', name: 'Cheese Chilli Garlic Bread', price: 109, stock: true },
  { id: 'gb3', category: 'Garlic Bread', name: 'Cheese Corn Garlic Bread', price: 109, stock: true },

  { id: 'pa1', category: 'Pasta', name: 'Penne Arrabiata Pasta', price: 139, stock: true },
  { id: 'pa2', category: 'Pasta', name: 'Alfredo Pasta', price: 139, stock: true },
  { id: 'pa3', category: 'Pasta', name: 'Mamma Rosa Pasta', price: 139, stock: true },
  { id: 'pa4', category: 'Pasta', name: 'Spaghetti Aglio Olio', price: 139, stock: true },
  { id: 'pa5', category: 'Pasta', name: 'Mushroom Pasta', price: 169, stock: true },
  { id: 'pa6', category: 'Pasta', name: 'Paneer Tikka Pasta', price: 169, stock: true },

  { id: 'f1', category: 'Fries', name: 'Classic Fries', price: 79, stock: true },
  { id: 'f2', category: 'Fries', name: 'Peri Peri Fries', price: 89, stock: true },
  { id: 'f3', category: 'Fries', name: 'Schezwan French Fries', price: 99, stock: true },
  { id: 'f4', category: 'Fries', name: 'Chilli Garlic Fries', price: 109, stock: true },
  { id: 'f5', category: 'Fries', name: 'Cheese Loaded Fries', price: 119, stock: true },

  { id: 's1', category: 'Sandwich', name: 'Vegetable Sandwich', price: 69, stock: true },
  { id: 's2', category: 'Sandwich', name: 'Russian Salad Sandwich', price: 79, stock: true },
  { id: 's3', category: 'Sandwich', name: 'Mumbai Club Sandwich', price: 89, stock: true },
  { id: 's4', category: 'Sandwich', name: 'Vegetable Grill Sandwich', price: 89, stock: true },
  { id: 's5', category: 'Sandwich', name: 'Vegetable Cheese Grill Sandwich', price: 109, stock: true },
  { id: 's6', category: 'Sandwich', name: 'Chilli Cheese Onion Club Grill Sandwich', price: 119, stock: true },
  { id: 's7', category: 'Sandwich', name: 'Paneer Tikka Grill Sandwich', price: 149, stock: true },
  { id: 's8', category: 'Sandwich', name: 'Mushroom Cheese Grill Sandwich', price: 149, stock: true },

  { id: 'mg1', category: 'Maggie', name: 'Masala Maggie', price: 49, stock: true },
  { id: 'mg2', category: 'Maggie', name: 'Butter Maggie', price: 59, stock: true },
  { id: 'mg3', category: 'Maggie', name: 'Vegetable Maggie', price: 69, stock: true },
  { id: 'mg4', category: 'Maggie', name: 'Peri Peri Cheese Maggie', price: 89, stock: true },
  { id: 'mg5', category: 'Maggie', name: 'Paneer Vegetable Maggie', price: 89, stock: true },
  { id: 'mg6', category: 'Maggie', name: 'Paneer Maggie', price: 89, stock: true },

  { id: 'pn1', category: 'Panini', name: 'Classic Panini', price: 129, stock: true },
  { id: 'pn2', category: 'Panini', name: 'Mix Vegetable Panini', price: 139, stock: true },
  { id: 'pn3', category: 'Panini', name: 'Schezwan Panini', price: 149, stock: true },
  { id: 'pn4', category: 'Panini', name: 'Paneer Panini', price: 159, stock: true },
  { id: 'pn5', category: 'Panini', name: 'Corn Cheese Chilli Panini', price: 169, stock: true },
  { id: 'pn6', category: 'Panini', name: 'Corn Schezwan Cheese Chilli Panini', price: 179, stock: true },

  { id: 'b1', category: 'Burger', name: 'Vegetable Burger', price: 89, stock: true },
  { id: 'b2', category: 'Burger', name: 'Vegetable Cheese Burger', price: 109, stock: true },
  { id: 'b3', category: 'Burger', name: 'Paneer Tikka Crispy Burger', price: 149, stock: true },
  { id: 'b4', category: 'Burger', name: 'Cheese Burst Burger', price: 179, stock: true },
  { id: 'b5', category: 'Burger', name: 'Maharaja Burger', price: 189, stock: true },

  { id: 'mo1', category: 'Momos', name: 'Vegetable Momos', price: 99, stock: true },
  { id: 'mo2', category: 'Momos', name: 'Schezwan Momos', price: 119, stock: true },
  { id: 'mo3', category: 'Momos', name: 'Mushroom Momos', price: 139, stock: true },
  { id: 'mo4', category: 'Momos', name: 'Paneer Momos', price: 159, stock: true },
  { id: 'mo5', category: 'Momos', name: 'Kurkure Momos', price: 159, stock: true },

  { id: 'fr1', category: 'Frankie', name: 'Noodles Frankie', price: 79, stock: true },
  { id: 'fr2', category: 'Frankie', name: 'Classic Frankie', price: 79, stock: true },
  { id: 'fr3', category: 'Frankie', name: 'Paneer Tikka Frankie', price: 129, stock: true },
  { id: 'fr4', category: 'Frankie', name: 'Paneer Mushroom Frankie', price: 139, stock: true },
  { id: 'fr5', category: 'Frankie', name: 'Baby Corn Cheese Frankie', price: 139, stock: true },

  { id: 'co1', category: 'Combos', name: 'Pizza Combo', price: 359, desc: '1 Regular Pizza, 1 Classic Garlic Bread, Peri Peri Fries, Coke (500ml)', stock: true },
  { id: 'co2', category: 'Combos', name: 'Burger Combo', price: 299, desc: '1 Veg Burger, 1 Classic Garlic Bread, Peri Peri Fries, Coke (500ml)', stock: true },

  { id: 'bev1', category: 'Beverages', name: 'Hot Tea', price: 19, stock: true },
  { id: 'bev2', category: 'Beverages', name: 'Hot Coffee', price: 29, stock: true },
  { id: 'bev3', category: 'Beverages', name: 'Hot Chocolate', price: 69, stock: true },
  { id: 'bev4', category: 'Beverages', name: 'Thick Cold Coffee', price: 79, stock: true },

  { id: 'wf1', category: 'Waffles', name: 'Classic Waffle', price: 89, stock: true },
  { id: 'wf2', category: 'Waffles', name: 'Chocolate Waffle', price: 99, stock: true },
  { id: 'wf3', category: 'Waffles', name: 'Ice Cream Waffle', price: 119, stock: true },
  { id: 'wf4', category: 'Waffles', name: 'Strawberry Waffle', price: 109, stock: true },
  { id: 'wf5', category: 'Waffles', name: 'Banana Waffle', price: 109, stock: true },
  { id: 'wf6', category: 'Waffles', name: 'Nutella Waffle', price: 109, stock: true },

  { id: 'ds1', category: 'Desserts', name: 'Sizzling Brownie', price: 199, stock: true },

  { id: 'sc1', category: 'Scoop Ice Cream', name: '1 Scoop', price: 59, stock: true },
  { id: 'sc2', category: 'Scoop Ice Cream', name: '2 Scoops', price: 99, stock: true },

  { id: 'mk1', category: 'Mocktails', name: 'Ice Honey Lime Soda', price: 99, stock: true },
  { id: 'mk2', category: 'Mocktails', name: 'Strawberry Peach Soda', price: 99, stock: true },
  { id: 'mk3', category: 'Mocktails', name: 'Orange Ice Soda', price: 99, stock: true },
  { id: 'mk4', category: 'Mocktails', name: 'Blue Berry Mojito', price: 109, stock: true },
  { id: 'mk5', category: 'Mocktails', name: 'Mint Mojito', price: 109, stock: true },
  { id: 'mk6', category: 'Mocktails', name: 'Black Current Mojito', price: 109, stock: true },

  { id: 'ts1', category: 'Thick Shakes', name: 'Chocolate Thick Milkshake', price: 149, stock: true },
  { id: 'ts2', category: 'Thick Shakes', name: 'Mango Thick Milkshake', price: 149, stock: true },
  { id: 'ts3', category: 'Thick Shakes', name: 'Strawberry Thick Milkshake', price: 149, stock: true },
  { id: 'ts4', category: 'Thick Shakes', name: 'Oreo Thick Milkshake', price: 149, stock: true },
  { id: 'ts5', category: 'Thick Shakes', name: 'Kitkat Thick Milkshake', price: 149, stock: true },
  { id: 'ts6', category: 'Thick Shakes', name: 'Brownie Thick Milkshake', price: 169, stock: true },

  { id: 'lt1', category: 'Lattes', name: 'Spanish Ice Latte', price: 159, stock: true },
  { id: 'lt2', category: 'Lattes', name: 'Ice Mocha', price: 159, stock: true },
  { id: 'lt3', category: 'Lattes', name: 'Ice Caramel Latte', price: 159, stock: true },
  { id: 'lt4', category: 'Lattes', name: 'Iced Strawberry Coffee Latte', price: 179, stock: true },
  { id: 'lt5', category: 'Lattes', name: 'Oreo Spanish Latte', price: 179, stock: true },
  { id: 'lt6', category: 'Lattes', name: 'Biscoff Spanish Latte', price: 179, stock: true },
  { id: 'lt7', category: 'Lattes', name: 'Blue Vanilla Latte', price: 179, stock: true },
];

const initialStock = [{ id: 'i1', name: 'Pizza Base', qty: 40, price: 500, min: 10 }, { id: 'i2', name: 'Burger Buns', qty: 30, price: 300, min: 10 }];
const initialIceCream = [{ id: 'ic1', name: 'Vanilla', qty: 50, price: 400, min: 10 }, { id: 'ic2', name: 'Chocolate', qty: 30, price: 350, min: 10 }];
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
  const [mode, setMode] = useState(sessionTable ? 'customer' : 'landing');
  const [table, setTable] = useState(sessionTable);
  const [isAdminAuth, setIsAdminAuth] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [tables, setTables] = useState([]);
  const [stockInv, setStockInv] = useState([]);
  const [iceInv, setIceInv] = useState([]);
  const [cafeLogo, setCafeLogo] = useState('');

  // Daily 11 PM stock update reminder check
  useEffect(() => {
    const checkReminder = () => {
      const now = new Date();
      if (now.getHours() === 23 && now.getMinutes() === 0) {
        speak("Reminder! Please update your daily inventory stocks.");
        alert("🌙 Nightly Reminder: Please update your inventory stocks for the day!");
      }
    };
    const t = setInterval(checkReminder, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsubMenu = onSnapshot(collection(db, 'menu'), (snap) => {
      if (snap.empty) {
        initialMenu.forEach(item => setDoc(doc(db, 'menu', item.id), item));
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

    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (snap) => {
      if (snap.exists()) setCafeLogo(snap.data().logo || '');
    });

    return () => {
      unsubMenu(); unsubOrders(); unsubHistory(); unsubTables(); unsubStock(); unsubIce(); unsubSettings();
    };
  }, []);

  useEffect(() => {
    const unlock = () => { playSfx('click'); document.removeEventListener('click', unlock); };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  const placeOrder = async (tbl, cart, total, payment) => {
    const numericId = Math.floor(10000 + Math.random() * 90000).toString();
    const newOrder = { id: numericId, table: tbl, items: cart, total, payment, status: payment === 'Online' ? 'Verifying' : 'Pending', time: Date.now() };
    await setDoc(doc(db, 'orders', numericId), newOrder);
    playSfx('success');
  };

  const completeOrder = async (o) => {
    await setDoc(doc(db, 'history', o.id), { ...o, status: 'Completed', completedAt: Date.now() });
    await deleteDoc(doc(db, 'orders', o.id));
    playSfx('save');
  };

  const cancelOrder = async (id) => {
    await deleteDoc(doc(db, 'orders', id));
    playSfx('del');
  };

  const joinTable = (tblName) => {
    setTable(tblName);
    setSessionTable(tblName);
    localStorage.setItem('ec_active_table', tblName);
    setMode('customer');
  };

  const exitTable = () => {
    localStorage.removeItem('ec_active_table');
    setSessionTable(null);
    setTable(null);
    setMode('landing');
  };

  return (
    <div className="min-h-screen bg-purple-950 font-sans text-slate-100 selection:bg-purple-500">
      {mode === 'landing' && <LandingView tables={tables} activeOrders={activeOrders} logo={cafeLogo} onJoin={joinTable} onAdminLogin={() => { setIsAdminAuth(true); setMode('admin'); }} />}
      {mode === 'customer' && <CustomerView tableNumber={table} menuItems={menuItems} activeOrders={activeOrders} onPlaceOrder={placeOrder} onExit={exitTable} />}
      {mode === 'admin' && isAdminAuth && <AdminDashboard {...{ activeOrders, setActiveOrders, orderHistory, setOrderHistory, completeOrder, cancelOrder, menuItems, setMenuItems, tables, setTables, stockInv, setStockInv, iceInv, setIceInv, cafeLogo, setCafeLogo, db }} onExit={() => { setIsAdminAuth(false); setMode('landing'); }} />}
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

  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => (parseInt(a.name) || 0) - (parseInt(b.name) || 0));
  }, [tables]);

  const currentTable = sortedTables[wi] || { name: '1' };
  const isBooked = activeOrders.some(o => o.table === String(currentTable.name) && o.status !== 'Completed');

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
            onClick={() => { playSfx('click'); onJoin(currentTable.name); }} 
            className="w-64 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-xl py-4 rounded-full shadow-[0_10px_30px_rgba(147,51,234,0.4)] active:scale-95 transition-all"
          >
            {isBooked ? 'Already Booked' : 'JOIN TABLE'}
          </button>
        </div>
      </div>
      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} onSuccess={onAdminLogin} />}
    </div>
  );
}

function AdminLoginModal({ onClose, onSuccess }) {
  const [u, setU] = useState(''); 
  const [p, setP] = useState(''); 
  const [sp, setSp] = useState(false); 
  const [err, setErr] = useState('');

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

/* ---------------- CUSTOMER VIEW ---------------- */
function CustomerView({ tableNumber, menuItems, activeOrders, onPlaceOrder, onExit }) {
  const [cart, setCart] = useState([]); const [checkout, setCheckout] = useState(false);
  const cats = [...new Set(menuItems.map(i => i.category))]; const [activeCat, setActiveCat] = useState(cats[0]);
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0); const count = cart.reduce((s, c) => s + c.qty, 0);

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

  const add = (item, vi) => { playSfx('add'); const nm = item.name + (item.v ? ` (${item.v[vi][0]})` : ''); const pr = item.v ? item.v[vi][1] : item.price; const k = item.id + vi; setCart(p => p.find(c => c.key === k) ? p.map(c => c.key === k ? { ...c, qty: c.qty + 1 } : c) : [...p, { key: k, name: nm, price: pr, qty: 1 }]); };
  const chg = (k, d) => { playSfx(d > 0 ? 'add' : 'remove'); setCart(p => p.map(c => c.key === k ? { ...c, qty: c.qty + d } : c).filter(c => c.qty > 0)); };

  return (
    <div className="bg-purple-950 fixed inset-0 flex justify-center overflow-hidden">
      <div className="bg-slate-50 w-full max-w-md mx-auto sm:rounded-[2.5rem] sm:shadow-2xl overflow-hidden flex flex-col h-full relative text-slate-800">
        <header className="bg-purple-900 px-4 pt-4 pb-3 text-white shadow-md z-10 shrink-0">
          <div className="flex items-center justify-between mb-3">
            {onExit ? <button onClick={() => { playSfx('click'); onExit(); }} className="p-2 -ml-2 bg-purple-800 rounded-full flex items-center gap-1 text-xs font-bold"><ChevronLeft className="w-4 h-4" /> Exit</button> : <div className="w-9 h-9" />}
            <div className="bg-purple-950/50 px-4 py-1.5 rounded-full border border-purple-700/50"><h1 className="text-sm font-black tracking-widest uppercase text-purple-200">Table {tableNumber}</h1></div>
            <div className="w-9 h-9" />
          </div>
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">{cats.map(c => <button key={c} onClick={() => { playSfx('click'); setActiveCat(c); }} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold shrink-0 transition-colors ${activeCat === c ? 'bg-white text-purple-900 shadow-md' : 'bg-purple-800/80 text-purple-200'}`}>{c}</button>)}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 bg-slate-100">
          {status === 'Verifying' && <PaymentTimer order={tableOrder} />}
          {status === 'Pending' && <div className="bg-purple-100 border-l-4 border-purple-600 text-purple-900 p-4 rounded-2xl mb-4 shadow-sm"><p className="font-black text-lg">Order Placed!</p><p className="text-sm opacity-80">Waiting for restaurant confirmation.</p></div>}
          {status === 'Preparing' && <div className="bg-blue-100 border-l-4 border-blue-600 text-blue-900 p-4 rounded-2xl mb-4 shadow-sm"><p className="font-black text-lg">Preparing Order 👨‍🍳</p><p className="text-sm opacity-80">Kitchen is cooking your delicious meal.</p></div>}
          {status === 'Ready' && <div className="bg-green-100 border-l-4 border-green-600 text-green-900 p-4 rounded-2xl mb-4 shadow-sm animate-bounce"><p className="font-black text-xl">Your Order is Ready! 🎉</p><p className="text-sm opacity-80">Please pick it up from the counter.</p></div>}

          <div className="space-y-3 pb-24">
            {menuItems.filter(i => i.category === activeCat && i.stock).map(it => (
              <div key={it.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex gap-3">
                <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">{it.img ? <img src={it.img} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-300" />}</div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div><h3 className="font-black text-slate-900 leading-tight">{it.name}</h3>
                  {it.desc && <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{it.desc}</p>}
                  {it.v && <div className="flex flex-wrap gap-1 mt-1">{it.v.map((x, i) => <button key={i} onClick={() => add(it, i)} className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100 active:scale-95">{x[0]} ₹{x[1]}</button>)}</div>}</div>
                  {!it.v && <div className="flex justify-between items-end mt-1"><span className="font-black text-purple-700 text-lg">₹{it.price}</span><button onClick={() => add(it, 0)} className="bg-purple-100 text-purple-800 px-4 py-1.5 rounded-xl text-xs font-bold active:scale-95 hover:bg-purple-200">Add +</button></div>}
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
              <div className="flex justify-between items-center mb-5"><h3 className="text-2xl font-black text-slate-900">Your Order</h3><button onClick={() => { playSfx('click'); setCheckout(false); }} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button></div>
              <div className="bg-purple-50 p-5 rounded-3xl mb-6 border border-purple-100 shadow-inner">
                <p className="text-xs font-bold text-purple-600 uppercase mb-2 tracking-widest">Total Bill</p><div className="text-4xl font-black text-purple-900 mb-4">₹{total}</div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">{cart.map(c => <div key={c.key} className="flex items-center justify-between text-sm text-slate-700 font-bold border-b border-purple-100/50 pb-2"><span className="flex-1">{c.name}</span><div className="flex items-center gap-2 mx-2"><button onClick={() => chg(c.key, -1)} className="px-2 py-1 bg-white rounded-lg shadow-sm">-</button><span>{c.qty}</span><button onClick={() => chg(c.key, 1)} className="px-2 py-1 bg-white rounded-lg shadow-sm">+</button></div><span className="w-12 text-right">₹{c.price * c.qty}</span></div>)}</div>
              </div>
              <p className="font-bold text-slate-400 text-xs mb-3 uppercase tracking-widest">Select Payment</p>
              <div className="space-y-3">
                <button onClick={() => { playSfx('click'); onPlaceOrder(tableNumber, cart, total, 'Online'); setCart([]); setCheckout(false); }} className="w-full flex items-center p-4 border-2 border-purple-200 rounded-2xl bg-white hover:bg-purple-50 transition-colors"><div className="bg-purple-100 p-3 rounded-xl text-purple-700 mr-4"><CreditCard className="w-6 h-6" /></div><div><h4 className="font-bold text-slate-800 text-lg">Pay via UPI / GPay</h4><p className="text-xs text-slate-500 font-medium">Fast & secure online payment</p></div></button>
                <button onClick={() => { playSfx('click'); onPlaceOrder(tableNumber, cart, total, 'Cash'); setCart([]); setCheckout(false); }} className="w-full flex items-center p-4 border-2 border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-colors"><div className="bg-slate-100 p-3 rounded-xl text-slate-600 mr-4"><Banknote className="w-6 h-6" /></div><div><h4 className="font-bold text-slate-800 text-lg">Cash on Delivery</h4><p className="text-xs text-slate-500 font-medium">Pay directly to the waiter</p></div></button>
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
  
  const prevCount = useRef(p.activeOrders.length);
  useEffect(() => {
    if (p.activeOrders.length > prevCount.current) {
      const newOrder = p.activeOrders[0];
      playSfx('ring');
      setTimeout(() => {
        if (newOrder.payment === 'Online') {
          speak(`New online payment received for Table ${newOrder.table}. Please verify and accept.`);
        } else {
          speak(`New Cash on Delivery order for Table ${newOrder.table}.`);
        }
      }, 1500);
    }
    prevCount.current = p.activeOrders.length;
  }, [p.activeOrders]);

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
          {tab === 'qr' && <QRTab logo={p.cafeLogo} />}
          {tab === 'history' && <HistoryTab history={p.orderHistory} stockInv={p.stockInv} iceInv={p.iceInv} db={p.db} />}
          {tab === 'settings' && <SettingsTab logo={p.cafeLogo} db={p.db} />}
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
      <AdminCol title="Ready to Serve" icon={<CheckCircle />} list={col('Ready')} bg="bg-green-50" text="text-green-900" action="Complete Order" color="bg-green-600" onAction={(id) => updateStatus(id, 'Completed')} onCancel={cancelOrder} />
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
            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3"><div><h4 className="text-xl font-black text-slate-900">Table {o.table}</h4><span className="text-xs text-slate-400 font-mono font-bold">#{o.id}</span></div><div className="text-xl font-black text-purple-700">₹{o.total}</div></div>
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

/* ---------------- MENU CRUD TAB WITH SEARCH ---------------- */
function MenuTab({ menuItems, db }) {
  const [edit, setEdit] = useState(undefined);
  const [search, setSearch] = useState('');

  const filteredMenu = useMemo(() => {
    return menuItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));
  }, [menuItems, search]);

  const save = async (item) => {
    playSfx('save');
    if (edit && edit.id) {
      await updateDoc(doc(db, 'menu', edit.id), item);
    } else {
      await setDoc(doc(db, 'menu', 'm' + Date.now()), item);
    }
    setEdit(undefined);
  };
  const toggleStock = async (it) => {
    playSfx('click');
    await updateDoc(doc(db, 'menu', it.id), { stock: !it.stock });
  };
  const deleteItem = async (id) => {
    playSfx('del');
    await deleteDoc(doc(db, 'menu', id));
  };

  const categories = [...new Set(menuItems.map(i => i.category).filter(Boolean))];
  const descriptions = [...new Set(menuItems.map(i => i.desc).filter(Boolean))];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-slate-50">
        <h2 className="text-xl font-black text-slate-800">Menu Catalog ({menuItems.length})</h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold outline-none focus:border-purple-600" />
          </div>
          <button onClick={() => { playSfx('click'); setEdit(null); }} className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shrink-0"><Plus className="w-5 h-5" /> Add Menu</button>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left min-w-[640px]">
        <thead><tr className="bg-slate-100 text-slate-500 text-xs uppercase border-b"><th className="p-4 pl-6">Img</th><th className="p-4">Name / Category</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4 pr-6 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filteredMenu.map(it => (
          <tr key={it.id} className="hover:bg-slate-50">
            <td className="p-4 pl-6"><div className="w-12 h-12 bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center">{it.img ? <img src={it.img} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}</div></td>
            <td className="p-4"><p className="font-bold text-slate-900">{it.name}</p><p className="text-xs text-slate-500">{it.category}</p></td>
            <td className="p-4 font-black text-purple-700">₹{it.v ? it.v.map(x => x[1]).join(' / ') : it.price}</td>
            <td className="p-4"><button onClick={() => toggleStock(it)} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${it.stock ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{it.stock ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}{it.stock ? 'In Stock' : 'Out'}</button></td>
            <td className="p-4 pr-6 text-right"><div className="flex justify-end gap-2"><button onClick={() => { playSfx('click'); setEdit(it); }} className="p-2 text-slate-400 hover:text-purple-700 bg-slate-50 rounded-xl"><Edit className="w-4 h-4" /></button><DelBtn onDel={() => deleteItem(it.id)} /></div></td>
          </tr>
        ))}</tbody>
      </table></div>
      {edit !== undefined && <MenuForm item={edit} categories={categories} descriptions={descriptions} onSave={save} onClose={() => setEdit(undefined)} />}
    </div>
  );
}

function MenuForm({ item, categories, descriptions, onSave, onClose }) {
  const [img, setImg] = useState(item ? item.img : ''); const fileRef = useRef(null); const box = useRef(null);
  const submit = () => {
    const f = { get: (n) => box.current.querySelector(`[name="${n}"]`)?.value || '' };
    if (!f.get('name').trim() || !f.get('category').trim()) return playSfx('error');
    const vs = (f.get('v') || '').split(',').map(s => s.trim()).filter(Boolean).map(s => { const [l, p] = s.split(':'); return [l.trim(), Number(p)]; }).filter(x => x[0] && x[1]);
    onSave({ name: f.get('name'), category: f.get('category'), desc: f.get('desc'), img, price: vs.length ? vs[0][1] : Number(f.get('price')), v: vs.length > 1 ? vs : null, stock: item ? item.stock : true });
  };
  return (
    <Modal title={item ? 'Edit Menu Item' : 'New Menu Item'} onClose={onClose}>
      <div ref={box} className="space-y-3">
        <div><label className="text-xs font-bold text-slate-500 uppercase">Item name</label><input name="name" defaultValue={item?.name} className={inpStyle} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-500 uppercase">Price (₹)</label><input name="price" type="number" defaultValue={item?.price} className={inpStyle} /></div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
            <input name="category" list="cat-list" defaultValue={item?.category} className={inpStyle} />
            <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Description (Optional)</label>
          <input name="desc" list="desc-list" defaultValue={item?.desc} className={inpStyle} />
          <datalist id="desc-list">{descriptions.map(d => <option key={d} value={d} />)}</datalist>
        </div>
        <div><label className="text-xs font-bold text-slate-500 uppercase">Sizes (opt) e.g. Regular:149, Large:189</label><input name="v" defaultValue={item?.v ? item.v.map(x => x.join(':')).join(', ') : ''} className={inpStyle + ' text-sm'} /></div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Photo (Optional)</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files[0]) { playSfx('save'); setImg(await readImg(e.target.files[0])); } }} />
          <div className="flex gap-3 items-center mt-1"><div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex justify-center items-center">{img ? <img src={img} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}</div><button type="button" onClick={() => { playSfx('click'); fileRef.current.click(); }} className="bg-purple-100 text-purple-800 font-bold px-4 py-2 rounded-xl flex items-center gap-2"><Upload className="w-4 h-4"/> Upload Image</button></div>
        </div>
        <button type="button" onClick={submit} className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-4 rounded-xl mt-4">Save Item</button>
      </div>
    </Modal>
  );
}

/* ---------------- INVENTORY TAB (WITHOUT UNITS, RESPONSIVE) ---------------- */
function InventoryTab({ stockInv, iceInv, db }) {
  const [search, setSearch] = useState('');
  const stockLows = stockInv.filter(i => i.qty <= i.min);
  const iceLows = iceInv.filter(i => i.qty <= i.min);

  return (
    <div className="space-y-8">
      {stockLows.length > 0 && <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 font-bold text-sm flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0"/>{stockLows.map(l => `${l.name} is low`).join('. ')}</div>}
      {iceLows.length > 0 && <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-2xl p-4 font-bold text-sm flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0"/>Ice Cream Low: {iceLows.map(l => l.name).join(', ')}</div>}
      
      <div className="bg-white rounded-3xl border border-slate-200 p-4 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
        <input type="text" placeholder="Search inventory items..." value={search} onChange={e => setSearch(e.target.value)} className="w-full font-bold outline-none text-slate-800 text-sm md:text-base" />
      </div>

      <InvSection title="Ice Cream Inventory" icon={<IceCream className="w-5 h-5"/>} items={iceInv} colName="icecream" db={db} prefix="ic" search={search} />
      <InvSection title="Stock Inventory" icon={<Package className="w-5 h-5"/>} items={stockInv} colName="stock" db={db} prefix="i" search={search} />
    </div>
  );
}

function InvSection({ title, icon, items, colName, db, prefix, search }) {
  const [edit, setEdit] = useState(undefined); const box = useRef(null);

  const filteredItems = useMemo(() => {
    return items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const upd = async (id, qty, d) => {
    playSfx(d > 0 ? 'add' : 'remove');
    await updateDoc(doc(db, colName, id), { qty: Math.max(0, qty + d) });
  };
  const save = async () => {
    const f = { get: (n) => box.current.querySelector(`[name="${n}"]`)?.value || '' };
    if (!f.get('name')) return playSfx('error');
    playSfx('save');
    const data = { name: f.get('name'), qty: Number(f.get('qty')), price: Number(f.get('price') || 0), min: Number(f.get('min') || 10) };
    if (edit && edit.id) {
      await updateDoc(doc(db, colName, edit.id), data);
    } else {
      await setDoc(doc(db, colName, prefix + Date.now()), data);
    }
    setEdit(undefined);
  };
  const deleteInv = async (id) => { playSfx('del'); await deleteDoc(doc(db, colName, id)); };

  const names = [...new Set(items.map(i => i.name).filter(Boolean))];
  
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 gap-3">
        <h2 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2 truncate">{icon} {title}</h2>
        <button onClick={() => { playSfx('click'); setEdit(null); }} className="bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2 items-center text-sm shrink-0"><Plus className="w-4 h-4" /> Add Item</button>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left min-w-[500px]">
        <thead className="bg-slate-100 text-slate-500 text-xs uppercase"><tr><th className="p-4 pl-6">Item</th><th className="p-4">Qty</th><th className="p-4">Expense (₹)</th><th className="p-4">Alert At</th><th className="p-4 text-right pr-6">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filteredItems.map(i => (
          <tr key={i.id} className={i.qty <= i.min ? 'bg-red-50/60' : ''}>
            <td className="p-4 pl-6 font-bold">{i.name}</td>
            <td className="p-4"><div className="flex items-center gap-2"><button onClick={() => upd(i.id, i.qty, -1)} className="p-1.5 bg-slate-100 rounded-lg"><Minus className="w-4 h-4"/></button><span className="font-black w-12 text-center">{i.qty}</span><button onClick={() => upd(i.id, i.qty, 1)} className="p-1.5 bg-slate-100 rounded-lg"><Plus className="w-4 h-4"/></button></div></td>
            <td className="p-4 font-black text-purple-700">₹{i.price || 0}</td>
            <td className="p-4 font-bold text-slate-500">{i.min}</td>
            <td className="p-4 pr-6 text-right"><div className="flex justify-end gap-2"><button onClick={() => { playSfx('click'); setEdit(i); }} className="p-2 text-slate-400 bg-slate-50 rounded-xl hover:text-purple-700"><Edit className="w-4 h-4"/></button><DelBtn onDel={() => deleteInv(i.id)} /></div></td>
          </tr>
        ))}
        {filteredItems.length === 0 && <tr><td colSpan="5" className="p-8 text-center font-bold text-slate-400">Empty List</td></tr>}
        </tbody>
      </table></div>
      {edit !== undefined && (
        <Modal title={edit ? 'Edit Inventory Item' : 'Add Inventory Item'} onClose={() => setEdit(undefined)}>
          <div ref={box} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
              <input name="name" list={`name-list-${prefix}`} defaultValue={edit?.name} className={inpStyle} />
              <datalist id={`name-list-${prefix}`}>{names.map(n => <option key={n} value={n} />)}</datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Quantity (Number)</label><input name="qty" type="number" defaultValue={edit?.qty ?? 0} className={inpStyle} /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Expense Price (₹)</label><input name="price" type="number" defaultValue={edit?.price ?? 0} className={inpStyle} /></div>
            </div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Low Alert Limit</label><input name="min" type="number" defaultValue={edit?.min ?? 10} className={inpStyle} /></div>
            <button type="button" onClick={save} className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-4 rounded-xl mt-2">Save Item</button>
          </div>
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

/* ---------------- REVENUE & PROFIT/LOSS SECTION (RESPONSIVE) ---------------- */
function HistoryTab({ history, stockInv, iceInv, db }) {
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
    let c = 'ID,Table,Date,Time,Payment,Total,Items\n' + rows.map(o => { const d = new Date(o.completedAt || o.time); return `${o.id},${o.table},${d.toLocaleDateString()},${d.toLocaleTimeString()},${o.payment},${o.total},"${o.items.map(i => `${i.qty}x${i.name}`).join('; ')}"`; }).join('\n');
    c += `\n,,,,TOTAL REVENUE,${totalRevenue},\n,,,,TOTAL EXPENSE,${totalExpense},\n,,,,NET PROFIT/LOSS,${netProfitLoss},`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv' })); a.download = `financial_report_${from || 'all'}_${to || 'all'}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-wrap gap-4 items-end">
        <div><label className="text-xs font-bold text-slate-500 uppercase">From date</label><input type="date" value={from} onChange={e => { playSfx('click'); setFrom(e.target.value); }} className={inpStyle + ' py-2'} /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase">To date</label><input type="date" value={to} onChange={e => { playSfx('click'); setTo(e.target.value); }} className={inpStyle + ' py-2'} /></div>
        <button onClick={() => { playSfx('click'); setFrom(''); setTo(''); }} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200">Clear</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-purple-800 rounded-3xl p-6 text-white"><p className="text-purple-200 font-bold text-sm mb-1">Total Sales (Revenue)</p><h2 className="text-2xl md:text-3xl font-black">₹{totalRevenue}</h2></div>
        <div className="bg-amber-600 rounded-3xl p-6 text-white"><p className="text-amber-100 font-bold text-sm mb-1">Total Inventory Expense</p><h2 className="text-2xl md:text-3xl font-black">₹{totalExpense}</h2></div>
        <div className={`rounded-3xl p-6 text-white ${netProfitLoss >= 0 ? 'bg-green-600' : 'bg-red-600'}`}><p className="text-white/80 font-bold text-sm mb-1">Net Profit / Loss</p><h2 className="text-2xl md:text-3xl font-black">₹{netProfitLoss}</h2></div>
        <div className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-col justify-center"><button onClick={dlCsv} disabled={!rows.length} className="bg-indigo-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 text-sm"><Download className="w-4 h-4"/> Export Report</button></div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 text-slate-400 text-xs uppercase">
              <tr>
                <th className="p-4 pl-6">Order</th>
                <th className="p-4">Date</th>
                <th className="p-4">Table / Items</th>
                <th className="p-4">Pay Mode</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="p-4 pl-6 font-mono font-bold text-slate-600">#{o.id}</td>
                  <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{new Date(o.completedAt || o.time).toLocaleString()}</td>
                  <td className="p-4"><p className="font-bold">Table {o.table}</p><p className="text-xs text-slate-500">{o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</p></td>
                  <td className="p-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-md text-xs font-bold ${o.payment === 'Online' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>{o.payment}</span></td>
                  <td className="p-4 font-black text-purple-700 text-right text-lg whitespace-nowrap">₹{o.total}</td>
                  <td className="p-4 pr-6 text-right"><DelBtn onDel={() => deleteHistory(o.id)} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="6" className="p-10 text-center font-bold text-slate-400">No history found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SETTINGS TAB ---------------- */
function SettingsTab({ logo, db }) {
  const fileRef = useRef(null);
  const saveLogo = async (url) => {
    playSfx('save');
    await setDoc(doc(db, 'settings', 'config'), { logo: url });
  };
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-xl">
      <h2 className="text-2xl font-black text-slate-900 mb-6">Café Settings</h2>
      <div className="flex flex-col items-center bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200">
        <div className="w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden mb-5 border-4 border-purple-100">
          {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover"/> : <Coffee className="w-12 h-12 text-purple-300" />}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files[0]) saveLogo(await readImg(e.target.files[0])); }} />
        <button onClick={() => { playSfx('click'); fileRef.current.click(); }} className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-md"><Upload className="w-5 h-5"/> Upload Logo</button>
        {logo && <button onClick={() => saveLogo('')} className="text-red-500 font-bold text-sm mt-4 hover:underline">Remove Logo</button>}
        <p className="text-xs text-slate-400 text-center mt-4 max-w-xs">Upload a circular logo for the landing page wheel and printed QR cards.</p>
      </div>
    </div>
  );
}
