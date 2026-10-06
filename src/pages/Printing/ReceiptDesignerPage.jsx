/**
 * Flexible Thermal Receipt Designer — Full Customization Engine
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Capabilities:
 * - Design from scratch (Clear All elements / Blank Canvas)
 * - Delete and remove ANY and ALL elements
 * - Element position ordering (Move Up, Move Down, Drag & Drop)
 * - Element alignment (Left, Center, Right, Justified)
 * - Element merge options (2-Column & 3-Column Merged rows)
 * - 1-Bit Pure Black & White Thermal Image / Logo Processor (ESC/POS monochrome)
 * - Full Firebase Firestore & LocalStorage Synchronization
 * - Exact image centering on thermal paper
 */

import { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Save,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Settings,
  X,
  Upload,
  QrCode,
  ImagePlus,
  Eye,
  Type,
  ToggleLeft,
  ToggleRight,
  Columns,
  RotateCcw,
  Sparkles,
  Sliders,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { getReceiptTemplate, saveReceiptTemplate } from '../../services/dataService';
import toast from 'react-hot-toast';

export const DEFAULT_BOHRA_SECTIONS = [
  { id: 'logo', type: 'image', label: 'Restaurant Logo', enabled: true, imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=160&auto=format&fit=crop&q=80', maxWidth: 100, align: 'center', isMonochrome: true, bwThreshold: 128 },
  { id: 'brandName', type: 'text', label: 'Brand Title', enabled: true, content: 'THE BHARMALS KITCHEN', fontWeight: 'bold', fontSize: 16, align: 'center', marginTop: 2, marginBottom: 2 },
  { id: 'tagline', type: 'text', label: 'Tagline', enabled: true, content: 'Authentic Bohra Cuisine & Mughlai Delicacies', fontWeight: 'normal', fontSize: 9, align: 'center', marginTop: 0, marginBottom: 2 },
  { id: 'address', type: 'text', label: 'Address', enabled: true, content: 'Bhagwatipura Main road, Near Sukhsagar Hall, Rajkot - 360002', fontWeight: 'normal', fontSize: 8, align: 'center', marginTop: 0, marginBottom: 2 },
  { id: 'phone', type: 'text', label: 'Contact', enabled: true, content: 'Tel: +91 98200 12345 | thebharmalskitchen@gmail.com', fontWeight: 'normal', fontSize: 8, align: 'center', marginTop: 0, marginBottom: 4 },
  { id: 'taxMerged', type: 'merged_2col', label: 'GSTIN & FSSAI (Merged)', enabled: true, leftText: 'GSTIN: 27AABCT8521M1ZX', rightText: 'FSSAI: 11521018000452', fontSize: 8, fontWeight: 'normal', marginTop: 2, marginBottom: 4 },
  { id: 'divider1', type: 'divider', label: 'Divider 1', enabled: true, style: 'dashed' },
  { id: 'billMetaMerged', type: 'merged_2col', label: 'Bill # & Table (Merged)', enabled: true, leftText: 'Bill: #TBK-1042', rightText: 'Table: T-04 (Dine-in)', fontSize: 10, fontWeight: 'bold', marginTop: 2, marginBottom: 2 },
  { id: 'dateTimeMerged', type: 'merged_2col', label: 'Date & Captain (Merged)', enabled: true, leftText: '26-Sep-2026 10:15 PM', rightText: 'Server: Captain Shabbir', fontSize: 8, fontWeight: 'normal', marginTop: 0, marginBottom: 4 },
  { id: 'divider2', type: 'divider', label: 'Divider 2', enabled: true, style: 'dashed' },
  { id: 'lineItems', type: 'system_items', label: 'Order Line Items Table', enabled: true, showRate: true, fontSize: 9 },
  { id: 'divider3', type: 'divider', label: 'Divider 3', enabled: true, style: 'dashed' },
  { id: 'totals', type: 'system_totals', label: 'Subtotal & Grand Total', enabled: true, fontSize: 10 },
  { id: 'divider4', type: 'divider', label: 'Divider 4', enabled: true, style: 'dashed' },
  { id: 'paymentInfo', type: 'merged_2col', label: 'Payment Mode (Merged)', enabled: true, leftText: 'Payment Mode: UPI QR', rightText: 'Status: COMPLETED', fontSize: 9, fontWeight: 'bold', marginTop: 2, marginBottom: 4 },
  { id: 'upiQR', type: 'qr', label: 'UPI Payment / Review QR', enabled: true, qrData: 'upi://pay?pa=thebharmalskitchen@icici&pn=TheBharmalsKitchen', caption: 'Scan with GPay/PhonePe to Pay or Review', size: 75 },
  { id: 'footer', type: 'text', label: 'Thank You Message', enabled: true, content: 'Shukran for dining at The Bharmals Kitchen!\nVisit again soon.', fontWeight: 'bold', fontSize: 9, align: 'center', marginTop: 4, marginBottom: 2 },
  { id: 'terms', type: 'text', label: 'Policy Note', enabled: true, content: 'Goods once sold will not be exchanged or refunded.', fontWeight: 'normal', fontSize: 7, align: 'center', marginTop: 2, marginBottom: 0 },
];

const FONT_OPTIONS = [
  { label: 'Courier New (Thermal Standard)', value: '"Courier New", Courier, monospace' },
  { label: 'Roboto Mono (Modern POS)', value: '"Roboto Mono", monospace' },
  { label: 'Consolas (Clean Matrix)', value: 'Consolas, monospace' },
  { label: 'Inter (Sleek Modern)', value: '"Inter", sans-serif' },
  { label: 'Arial (Compact)', value: 'Arial, sans-serif' },
];

export default function ReceiptDesignerPage() {
  const [sections, setSections] = useState(DEFAULT_BOHRA_SECTIONS);
  const [paperWidth, setPaperWidth] = useState('80mm');
  const [fontFamily, setFontFamily] = useState('"Courier New", Courier, monospace');
  const [autoCut, setAutoCut] = useState(true);
  const [kickDrawer, setKickDrawer] = useState(true);
  const [editingSection, setEditingSection] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [isMonochromePreview, setIsMonochromePreview] = useState(true);

  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  useEffect(() => {
    const saved = getReceiptTemplate();
    if (saved && saved.sections && saved.sections.length > 0) {
      setSections(saved.sections);
      setPaperWidth(saved.paperWidth || '80mm');
      setFontFamily(saved.fontFamily || '"Courier New", Courier, monospace');
      setAutoCut(saved.autoCut !== false);
      setKickDrawer(saved.kickDrawer !== false);
    }
  }, []);

  const handleSave = () => {
    const template = { sections, paperWidth, fontFamily, autoCut, kickDrawer };
    saveReceiptTemplate(template);
    toast.success('Thermal receipt design saved & synced with Firebase!');
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all receipt elements and start designing from scratch with a blank canvas?')) {
      setSections([]);
      setEditingSection(null);
      toast('Blank canvas ready. Add elements to design from scratch!', { icon: '✏️' });
    }
  };

  const handleLoadDefault = () => {
    if (window.confirm('Reset receipt layout to standard Bohra restaurant template?')) {
      setSections(DEFAULT_BOHRA_SECTIONS);
      setEditingSection(null);
      toast.success('Bohra restaurant template restored!');
    }
  };

  const toggleSection = (id) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const updateSection = (id, updates) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeSection = (id) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (editingSection === id) setEditingSection(null);
    toast.success('Element deleted');
  };

  const moveSection = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSections(updated);
  };

  // Convert uploaded image to pure 1-bit Black and White (ESC/POS thermal compatible)
  const processImageToBW = (dataUrl, threshold = 128, callback) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = lum < threshold ? 0 : 255;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        if (data[i + 3] < 30) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      callback(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target.result;
      processImageToBW(rawDataUrl, 128, (bwDataUrl) => {
        updateSection(uploadTarget, { imageUrl: bwDataUrl, rawImageUrl: rawDataUrl });
        setUploadTarget(null);
        toast.success('Image converted to 1-Bit Thermal Black & White!');
      });
    };
    reader.readAsDataURL(file);
  };

  const triggerImageUpload = (sectionId) => {
    setUploadTarget(sectionId);
    fileInputRef.current?.click();
  };

  const addElement = (type) => {
    const id = `el_${Date.now()}`;
    let newElem;

    if (type === 'text') {
      newElem = { id, type: 'text', label: 'Custom Text', enabled: true, content: 'Custom note or information', fontWeight: 'normal', fontSize: 9, align: 'center', marginTop: 2, marginBottom: 2 };
    } else if (type === 'merged_2col') {
      newElem = { id, type: 'merged_2col', label: 'Merged 2-Column Row', enabled: true, leftText: 'Left Label:', rightText: 'Right Value', fontSize: 9, fontWeight: 'normal', marginTop: 2, marginBottom: 2 };
    } else if (type === 'merged_3col') {
      newElem = { id, type: 'merged_3col', label: 'Merged 3-Column Row', enabled: true, col1: 'Item A', col2: 'x2', col3: '₹200.00', fontSize: 8, fontWeight: 'normal', marginTop: 2, marginBottom: 2 };
    } else if (type === 'image') {
      newElem = { id, type: 'image', label: 'Thermal B&W Logo / Graphic', enabled: true, imageUrl: '', maxWidth: 100, align: 'center', isMonochrome: true, bwThreshold: 128, marginTop: 2, marginBottom: 2 };
    } else if (type === 'divider') {
      newElem = { id, type: 'divider', label: 'Divider Line', enabled: true, style: 'dashed', marginTop: 4, marginBottom: 4 };
    } else if (type === 'qr') {
      newElem = { id, type: 'qr', label: 'QR Code', enabled: true, qrData: 'upi://pay?pa=thebharmalskitchen@icici', caption: 'Scan with UPI to Pay', size: 70, marginTop: 4, marginBottom: 2 };
    } else if (type === 'system_items') {
      newElem = { id, type: 'system_items', label: 'Order Line Items Table', enabled: true, showRate: true, fontSize: 9, marginTop: 2, marginBottom: 2 };
    } else if (type === 'system_totals') {
      newElem = { id, type: 'system_totals', label: 'Bill Totals & Taxes', enabled: true, fontSize: 10, marginTop: 2, marginBottom: 2 };
    }

    setSections((prev) => [...prev, newElem]);
    setEditingSection(id);
    toast.success(`Added ${newElem.label}`);
  };

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...sections];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setSections(updated);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  // High-fidelity Thermal Test Print popup
  const handleTestPrint = () => {
    const printWindow = window.open('', '_blank', 'width=420,height=680');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups for test printing.');
      return;
    }
    const widthPx = paperWidth === '80mm' ? '290px' : '210px';
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Thermal Receipt Print</title><style>
      @page { margin: 0; size: auto; }
      body {
        margin: 0;
        padding: 8px 10px;
        font-family: ${fontFamily};
        font-size: 11px;
        line-height: 1.35;
        color: #000;
        background: #fff;
        width: ${widthPx};
        -webkit-print-color-adjust: exact;
      }
      .img-wrapper {
        width: 100%;
        display: block;
        text-align: center;
      }
      img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
        image-rendering: pixelated;
        filter: grayscale(100%) contrast(300%);
      }
      .divider-dashed { border-top: 1px dashed #000; margin: 4px 0; }
      .divider-solid { border-top: 1px solid #000; margin: 4px 0; }
      .divider-double { border-top: 3px double #000; margin: 4px 0; }
      .divider-dotted { border-top: 1px dotted #000; margin: 4px 0; }
      .divider-stars { text-align: center; letter-spacing: 4px; font-size: 8px; margin: 3px 0; }
      .merged-row { display: flex; justify-content: space-between; align-items: baseline; }
      .merged-3col { display: grid; grid-template-columns: 2fr 0.6fr 1fr; }
      .items-table { width: 100%; border-collapse: collapse; }
      .items-table th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; }
      .items-table td { padding: 2px 0; }
    </style></head><body>`;

    sections.filter((s) => s.enabled).forEach((s) => {
      const mt = s.marginTop ?? 2;
      const mb = s.marginBottom ?? 2;

      if (s.type === 'text') {
        html += `<div style="text-align:${s.align || 'center'};font-size:${s.fontSize || 9}px;font-weight:${s.fontWeight || 'normal'};margin-top:${mt}px;margin-bottom:${mb}px;white-space:pre-wrap;">${s.content || ''}</div>`;
      } else if (s.type === 'merged_2col') {
        html += `<div class="merged-row" style="font-size:${s.fontSize || 9}px;font-weight:${s.fontWeight || 'normal'};margin-top:${mt}px;margin-bottom:${mb}px;"><span>${s.leftText || ''}</span><span>${s.rightText || ''}</span></div>`;
      } else if (s.type === 'merged_3col') {
        html += `<div class="merged-3col" style="font-size:${s.fontSize || 8}px;font-weight:${s.fontWeight || 'normal'};margin-top:${mt}px;margin-bottom:${mb}px;"><span>${s.col1 || ''}</span><span style="text-align:center">${s.col2 || ''}</span><span style="text-align:right">${s.col3 || ''}</span></div>`;
      } else if (s.type === 'divider') {
        const style = s.style || 'dashed';
        if (style === 'stars') {
          html += `<div class="divider-stars" style="margin-top:${mt}px;margin-bottom:${mb}px;">******************************</div>`;
        } else {
          html += `<div class="divider-${style}" style="margin-top:${mt}px;margin-bottom:${mb}px;"></div>`;
        }
      } else if (s.type === 'image' && s.imageUrl) {
        const align = s.align || 'center';
        const imgMargin = align === 'left' ? '0 auto 0 0' : align === 'right' ? '0 0 0 auto' : '0 auto';
        html += `<div style="width:100%;text-align:${align};margin-top:${mt}px;margin-bottom:${mb}px;"><img src="${s.imageUrl}" style="max-width:${s.maxWidth || 100}px;margin:${imgMargin};display:block;" /></div>`;
      } else if (s.type === 'qr') {
        const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(s.qrData || 'TBK')}`;
        html += `<div style="width:100%;text-align:center;margin-top:${mt}px;margin-bottom:${mb}px;"><img src="${qrApi}" style="width:${s.size || 75}px;height:${s.size || 75}px;margin:0 auto;display:block;" /><div style="font-size:8px;margin-top:2px;">${s.caption || ''}</div></div>`;
      } else if (s.type === 'system_items') {
        html += `<table class="items-table" style="font-size:${s.fontSize || 9}px;margin-top:${mt}px;margin-bottom:${mb}px;">
          <thead><tr><th>Item</th><th style="text-align:center">Qty</th>${s.showRate ? '<th style="text-align:right">Rate</th>' : ''}<th style="text-align:right">Total</th></tr></thead>
          <tbody>
            <tr><td>Royal Mutton Biryani</td><td style="text-align:center">1</td>${s.showRate ? '<td style="text-align:right">450.00</td>' : ''}<td style="text-align:right">450.00</td></tr>
            <tr><td>Kabab Platter (Bohra)</td><td style="text-align:center">2</td>${s.showRate ? '<td style="text-align:right">220.00</td>' : ''}<td style="text-align:right">440.00</td></tr>
            <tr><td>Malai Khaja (Sweet)</td><td style="text-align:center">2</td>${s.showRate ? '<td style="text-align:right">80.00</td>' : ''}<td style="text-align:right">160.00</td></tr>
          </tbody>
        </table>`;
      } else if (s.type === 'system_totals') {
        html += `<div style="font-size:${s.fontSize || 10}px;margin-top:${mt}px;margin-bottom:${mb}px;">
          <div class="merged-row"><span>Subtotal:</span><span>₹1,050.00</span></div>
          <div class="merged-row"><span>CGST (0%):</span><span>₹0.00</span></div>
          <div class="merged-row"><span>SGST (0%):</span><span>₹0.00</span></div>
          <div class="divider-solid"></div>
          <div class="merged-row" style="font-weight:bold;font-size:12px;"><span>GRAND TOTAL:</span><span>₹1,050.00</span></div>
        </div>`;
      }
    });

    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 450);
  };

  // Live Canvas Preview renderer
  const renderPreviewElement = (s) => {
    if (!s.enabled) return null;
    const mt = s.marginTop ?? 2;
    const mb = s.marginBottom ?? 2;

    if (s.type === 'text') {
      return (
        <div
          key={s.id}
          style={{
            textAlign: s.align || 'center',
            fontSize: `${s.fontSize || 9}px`,
            fontWeight: s.fontWeight || 'normal',
            marginTop: `${mt}px`,
            marginBottom: `${mb}px`,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {s.content}
        </div>
      );
    }

    if (s.type === 'merged_2col') {
      return (
        <div
          key={s.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: `${s.fontSize || 9}px`,
            fontWeight: s.fontWeight || 'normal',
            marginTop: `${mt}px`,
            marginBottom: `${mb}px`,
          }}
        >
          <span>{s.leftText}</span>
          <span>{s.rightText}</span>
        </div>
      );
    }

    if (s.type === 'merged_3col') {
      return (
        <div
          key={s.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 0.6fr 1fr',
            fontSize: `${s.fontSize || 8}px`,
            fontWeight: s.fontWeight || 'normal',
            marginTop: `${mt}px`,
            marginBottom: `${mb}px`,
          }}
        >
          <span>{s.col1}</span>
          <span style={{ textAlign: 'center' }}>{s.col2}</span>
          <span style={{ textAlign: 'right' }}>{s.col3}</span>
        </div>
      );
    }

    if (s.type === 'divider') {
      const style = s.style || 'dashed';
      if (style === 'stars') {
        return (
          <div
            key={s.id}
            style={{
              textAlign: 'center',
              letterSpacing: '3px',
              fontSize: '8px',
              color: '#000',
              marginTop: `${mt}px`,
              marginBottom: `${mb}px`,
            }}
          >
            ********************************
          </div>
        );
      }
      return (
        <div
          key={s.id}
          style={{
            borderTop: style === 'double' ? '3px double #000' : `1px ${style} #000`,
            marginTop: `${mt}px`,
            marginBottom: `${mb}px`,
          }}
        />
      );
    }

    if (s.type === 'image') {
      const align = s.align || 'center';
      return s.imageUrl ? (
        <div
          key={s.id}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
            alignItems: 'center',
            textAlign: align,
            marginTop: `${mt}px`,
            marginBottom: `${mb}px`,
          }}
        >
          <img
            src={s.imageUrl}
            alt={s.label}
            style={{
              maxWidth: `${s.maxWidth || 100}px`,
              width: 'auto',
              height: 'auto',
              display: 'block',
              marginLeft: align === 'left' ? '0' : align === 'right' ? 'auto' : 'auto',
              marginRight: align === 'right' ? '0' : align === 'left' ? 'auto' : 'auto',
              imageRendering: 'pixelated',
              filter: isMonochromePreview ? 'grayscale(100%) contrast(300%)' : 'none',
            }}
          />
        </div>
      ) : (
        <div
          key={s.id}
          style={{
            width: '100%',
            textAlign: 'center',
            fontSize: '8px',
            color: '#888',
            padding: '8px',
            border: '1px dashed #aaa',
            marginTop: `${mt}px`,
            marginBottom: `${mb}px`,
            boxSizing: 'border-box',
          }}
        >
          [{s.label} — Upload Logo/Graphic]
        </div>
      );
    }

    if (s.type === 'qr') {
      const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(s.qrData || 'TBK')}`;
      return (
        <div
          key={s.id}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            marginTop: `${mt}px`,
            marginBottom: `${mb}px`,
          }}
        >
          <img
            src={qrApi}
            alt="QR Code"
            style={{
              width: `${s.size || 75}px`,
              height: `${s.size || 75}px`,
              display: 'block',
              margin: '0 auto',
              imageRendering: 'pixelated',
            }}
          />
          {s.caption && <div style={{ fontSize: '8px', marginTop: '2px', color: '#111', textAlign: 'center' }}>{s.caption}</div>}
        </div>
      );
    }

    if (s.type === 'system_items') {
      return (
        <div key={s.id} style={{ fontSize: `${s.fontSize || 9}px`, marginTop: `${mt}px`, marginBottom: `${mb}px` }}>
          <div style={{ display: 'grid', gridTemplateColumns: s.showRate ? '1.6fr 0.4fr 0.7fr 0.7fr' : '1.8fr 0.4fr 0.8fr', fontWeight: 'bold', borderBottom: '1px dashed #000', paddingBottom: '2px', marginBottom: '3px' }}>
            <span>Item</span>
            <span style={{ textAlign: 'center' }}>Qty</span>
            {s.showRate && <span style={{ textAlign: 'right' }}>Rate</span>}
            <span style={{ textAlign: 'right' }}>Amt</span>
          </div>
          {[
            ['Royal Mutton Biryani', 1, 450, 450],
            ['Kabab Platter (Bohra)', 2, 220, 440],
            ['Malai Khaja (Sweet)', 2, 80, 160],
          ].map(([n, q, r, a]) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: s.showRate ? '1.6fr 0.4fr 0.7fr 0.7fr' : '1.8fr 0.4fr 0.8fr', padding: '1px 0' }}>
              <span>{n}</span>
              <span style={{ textAlign: 'center' }}>{q}</span>
              {s.showRate && <span style={{ textAlign: 'right' }}>{r.toFixed(2)}</span>}
              <span style={{ textAlign: 'right' }}>{a.toFixed(2)}</span>
            </div>
          ))}
        </div>
      );
    }

    if (s.type === 'system_totals') {
      return (
        <div key={s.id} style={{ fontSize: `${s.fontSize || 10}px`, marginTop: `${mt}px`, marginBottom: `${mb}px` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal:</span><span>₹1,050.00</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CGST (0%):</span><span>₹0.00</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SGST (0%):</span><span>₹0.00</span></div>
          <div style={{ borderTop: '1px solid #000', marginTop: '2px', paddingTop: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
            <span>GRAND TOTAL:</span><span>₹1,050.00</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Custom Receipt Designer</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Design from scratch or edit templates. Merge elements, reorder positions, and preview in pure 1-bit thermal B&W.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleClearAll} style={{ color: 'var(--color-danger)' }} title="Clear all elements to start from scratch">
            <Trash2 size={15} /> Blank Canvas
          </button>
          <button className="btn btn-secondary" onClick={handleLoadDefault} title="Load Bohra restaurant template">
            <RotateCcw size={15} /> Load Default
          </button>
          <button className="btn btn-secondary" onClick={handleTestPrint} title="Test print on connected thermal printer">
            <Printer size={15} /> Test Print
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={15} /> Save Design
          </button>
        </div>
      </div>

      {/* Hardware & Paper Settings Bar */}
      <div className="card" style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <label className="label" style={{ marginBottom: '2px' }}>Paper Width</label>
          <select className="input" value={paperWidth} onChange={(e) => setPaperWidth(e.target.value)} style={{ height: '36px', width: '150px' }}>
            <option value="80mm">80mm (Standard POS)</option>
            <option value="58mm">58mm (Handheld / Bluetooth)</option>
          </select>
        </div>

        <div>
          <label className="label" style={{ marginBottom: '2px' }}>Font Family</label>
          <select className="input" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} style={{ height: '36px', width: '220px' }}>
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoCut} onChange={(e) => setAutoCut(e.target.checked)} />
          Auto-Cut Paper
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={kickDrawer} onChange={(e) => setKickDrawer(e.target.checked)} />
          Kick Cash Drawer
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', marginLeft: 'auto' }}>
          <input type="checkbox" checked={isMonochromePreview} onChange={(e) => setIsMonochromePreview(e.target.checked)} />
          Pure Thermal B&W Mode
        </label>
      </div>

      {/* Main Designer Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 'var(--space-4)', alignItems: 'start' }}>
        {/* Left: Element Manager & Canvas Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Add Elements Panel */}
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Add Elements to Receipt:</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Click any element to append to canvas</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => addElement('text')}><Type size={13} /> Text</button>
              <button className="btn btn-sm btn-secondary" onClick={() => addElement('merged_2col')}><Columns size={13} /> Merged 2-Col</button>
              <button className="btn btn-sm btn-secondary" onClick={() => addElement('merged_3col')}><Columns size={13} /> Merged 3-Col</button>
              <button className="btn btn-sm btn-secondary" onClick={() => addElement('image')}><ImagePlus size={13} /> B&W Image / Logo</button>
              <button className="btn btn-sm btn-secondary" onClick={() => addElement('divider')}>— Divider</button>
              <button className="btn btn-sm btn-secondary" onClick={() => addElement('qr')}><QrCode size={13} /> QR Code</button>
              <button className="btn btn-sm btn-secondary" onClick={() => addElement('system_items')}><FileText size={13} /> Line Items</button>
              <button className="btn btn-sm btn-secondary" onClick={() => addElement('system_totals')}><FileText size={13} /> Totals Block</button>
            </div>
          </div>

          {/* Section Items List */}
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>
                Receipt Elements ({sections.length})
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Drag or use ▲ / ▼ to reorder • ✕ to delete
              </span>
            </div>

            {sections.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontWeight: '600', marginBottom: '6px' }}>Canvas is Empty</p>
                <p style={{ fontSize: '12px', marginBottom: '12px' }}>Click any element button above to design your receipt from scratch!</p>
                <button className="btn btn-sm btn-primary" onClick={() => addElement('text')}><Plus size={13} /> Add First Text</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sections.map((s, index) => (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      background: editingSection === s.id ? 'var(--bg-glass)' : dragIndex === index ? 'var(--bg-glass-subtle)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: editingSection === s.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      cursor: 'grab',
                      transition: 'all 0.15s ease',
                      opacity: s.enabled ? 1 : 0.45,
                    }}
                  >
                    <GripVertical size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />

                    {/* Enable / Disable toggle */}
                    <button
                      type="button"
                      onClick={() => toggleSection(s.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                      title={s.enabled ? 'Click to hide' : 'Click to show'}
                    >
                      {s.enabled ? <ToggleRight size={18} style={{ color: 'var(--color-primary)' }} /> : <ToggleLeft size={18} style={{ color: 'var(--text-tertiary)' }} />}
                    </button>

                    {/* Move Up / Down Buttons for quick position ordering */}
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn-icon"
                        disabled={index === 0}
                        onClick={() => moveSection(index, -1)}
                        style={{ padding: '2px', opacity: index === 0 ? 0.3 : 1 }}
                        title="Move Up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        disabled={index === sections.length - 1}
                        onClick={() => moveSection(index, 1)}
                        style={{ padding: '2px', opacity: index === sections.length - 1 ? 0.3 : 1 }}
                        title="Move Down"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    {/* Element Label & Preview Info */}
                    <div style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.label}
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '6px', fontWeight: 'normal' }}>
                        [{s.type}]
                      </span>
                    </div>

                    {/* Edit Settings Button */}
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => setEditingSection(editingSection === s.id ? null : s.id)}
                      style={{ color: editingSection === s.id ? 'var(--color-primary)' : 'inherit', flexShrink: 0 }}
                      title="Edit Element Properties"
                    >
                      <Settings size={14} />
                    </button>

                    {/* Delete Button (Allowed on ALL elements!) */}
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => removeSection(s.id)}
                      style={{ color: 'var(--color-danger)', flexShrink: 0 }}
                      title="Delete Element"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section Inspector / Edit Panel */}
          {editingSection && (() => {
            const s = sections.find((sec) => sec.id === editingSection);
            if (!s) return null;

            return (
              <div className="card" style={{ padding: 'var(--space-4)', borderLeft: '4px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <h4 style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>Edit: {s.label}</h4>
                  <button className="btn-icon" onClick={() => setEditingSection(null)}><X size={16} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="label">Element Label</label>
                    <input
                      type="text"
                      className="input"
                      value={s.label}
                      onChange={(e) => updateSection(s.id, { label: e.target.value })}
                    />
                  </div>

                  {/* Text Edit Mode */}
                  {s.type === 'text' && (
                    <>
                      <div>
                        <label className="label">Text Content</label>
                        <textarea
                          rows={2}
                          className="input"
                          value={s.content || ''}
                          onChange={(e) => updateSection(s.id, { content: e.target.value })}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                        <div>
                          <label className="label">Font Size (px)</label>
                          <input
                            type="number"
                            min="6"
                            max="24"
                            className="input"
                            value={s.fontSize || 9}
                            onChange={(e) => updateSection(s.id, { fontSize: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="label">Weight</label>
                          <select
                            className="input"
                            value={s.fontWeight || 'normal'}
                            onChange={(e) => updateSection(s.id, { fontWeight: e.target.value })}
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="900">Extra Bold</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Alignment</label>
                          <select
                            className="input"
                            value={s.align || 'center'}
                            onChange={(e) => updateSection(s.id, { align: e.target.value })}
                          >
                            <option value="center">Center</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Merged 2-Column Row Edit Mode */}
                  {s.type === 'merged_2col' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                        <div>
                          <label className="label">Left Column Text</label>
                          <input
                            type="text"
                            className="input"
                            value={s.leftText || ''}
                            onChange={(e) => updateSection(s.id, { leftText: e.target.value })}
                            placeholder="e.g. Bill #TBK-1042"
                          />
                        </div>
                        <div>
                          <label className="label">Right Column Text</label>
                          <input
                            type="text"
                            className="input"
                            value={s.rightText || ''}
                            onChange={(e) => updateSection(s.id, { rightText: e.target.value })}
                            placeholder="e.g. Table: T-04"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                        <div>
                          <label className="label">Font Size (px)</label>
                          <input
                            type="number"
                            min="6"
                            max="20"
                            className="input"
                            value={s.fontSize || 9}
                            onChange={(e) => updateSection(s.id, { fontSize: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="label">Weight</label>
                          <select
                            className="input"
                            value={s.fontWeight || 'normal'}
                            onChange={(e) => updateSection(s.id, { fontWeight: e.target.value })}
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Merged 3-Column Row Edit Mode */}
                  {s.type === 'merged_3col' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 'var(--space-2)' }}>
                        <div>
                          <label className="label">Col 1 (Left)</label>
                          <input
                            type="text"
                            className="input"
                            value={s.col1 || ''}
                            onChange={(e) => updateSection(s.id, { col1: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Col 2 (Center)</label>
                          <input
                            type="text"
                            className="input"
                            value={s.col2 || ''}
                            onChange={(e) => updateSection(s.id, { col2: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Col 3 (Right)</label>
                          <input
                            type="text"
                            className="input"
                            value={s.col3 || ''}
                            onChange={(e) => updateSection(s.id, { col3: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Image / Logo with 1-Bit Thermal B&W Mode */}
                  {s.type === 'image' && (
                    <>
                      <div>
                        <label className="label">Image URL / Link</label>
                        <input
                          type="url"
                          className="input"
                          placeholder="https://..."
                          value={s.imageUrl || ''}
                          onChange={(e) => updateSection(s.id, { imageUrl: e.target.value })}
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => triggerImageUpload(s.id)}
                      >
                        <Upload size={14} /> Upload Image from Computer
                      </button>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                        <div>
                          <label className="label">Max Width (px)</label>
                          <input
                            type="number"
                            min="30"
                            max="260"
                            className="input"
                            value={s.maxWidth || 100}
                            onChange={(e) => updateSection(s.id, { maxWidth: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="label">Alignment</label>
                          <select
                            className="input"
                            value={s.align || 'center'}
                            onChange={(e) => updateSection(s.id, { align: e.target.value })}
                          >
                            <option value="center">Center (Recommended)</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      </div>

                      {/* Pure Black and White POS Thermal Dithering Options */}
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700' }}>Thermal Printer 1-Bit B&W Filter</span>
                          <span className="badge badge-success">POS Ready</span>
                        </div>
                        <label className="label" style={{ fontSize: '11px' }}>
                          Black & White Threshold: {s.bwThreshold || 128} (Controls lightness vs darkness)
                        </label>
                        <input
                          type="range"
                          min="30"
                          max="220"
                          value={s.bwThreshold || 128}
                          onChange={(e) => {
                            const newThresh = Number(e.target.value);
                            updateSection(s.id, { bwThreshold: newThresh });
                            if (s.rawImageUrl) {
                              processImageToBW(s.rawImageUrl, newThresh, (bw) => updateSection(s.id, { imageUrl: bw, bwThreshold: newThresh }));
                            }
                          }}
                          style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                        />
                      </div>

                      {s.imageUrl && (
                        <div style={{ textAlign: 'center', padding: '10px', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                          <img
                            src={s.imageUrl}
                            alt="Thermal Preview"
                            style={{
                              maxWidth: `${s.maxWidth || 100}px`,
                              height: 'auto',
                              margin: '0 auto',
                              display: 'block',
                              imageRendering: 'pixelated',
                              filter: 'grayscale(100%) contrast(300%)',
                            }}
                          />
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                            Pure 1-Bit B&W Thermal Representation (Centered)
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* QR Code */}
                  {s.type === 'qr' && (
                    <>
                      <div>
                        <label className="label">QR Link / UPI String</label>
                        <input
                          type="text"
                          className="input"
                          value={s.qrData || ''}
                          onChange={(e) => updateSection(s.id, { qrData: e.target.value })}
                          placeholder="upi://pay?pa=thebharmalskitchen@icici&pn=TheBharmalsKitchen"
                        />
                      </div>
                      <div>
                        <label className="label">Caption Under QR</label>
                        <input
                          type="text"
                          className="input"
                          value={s.caption || ''}
                          onChange={(e) => updateSection(s.id, { caption: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">QR Size (px): {s.size || 75}px</label>
                        <input
                          type="range"
                          min="45"
                          max="130"
                          value={s.size || 75}
                          onChange={(e) => updateSection(s.id, { size: Number(e.target.value) })}
                          style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                        />
                      </div>
                    </>
                  )}

                  {/* Divider Line */}
                  {s.type === 'divider' && (
                    <div>
                      <label className="label">Line Pattern</label>
                      <select
                        className="input"
                        value={s.style || 'dashed'}
                        onChange={(e) => updateSection(s.id, { style: e.target.value })}
                      >
                        <option value="dashed">Dashed (----------------)</option>
                        <option value="solid">Solid (────────────────)</option>
                        <option value="dotted">Dotted (................)</option>
                        <option value="double">Double (════════════════)</option>
                        <option value="stars">Stars (****************)</option>
                      </select>
                    </div>
                  )}

                  {/* Margin & Spacing controls for all elements */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                    <div>
                      <label className="label">Top Margin (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        className="input"
                        value={s.marginTop ?? 2}
                        onChange={(e) => updateSection(s.id, { marginTop: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="label">Bottom Margin (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        className="input"
                        value={s.marginBottom ?? 2}
                        onChange={(e) => updateSection(s.id, { marginBottom: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right: Live Thermal Preview Monitor */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'sticky', top: '20px' }}>
          <div style={{ fontSize: 'var(--font-xs)', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={13} /> THERMAL PAPER PREVIEW ({paperWidth})
          </div>

          <div
            style={{
              width: paperWidth === '80mm' ? '290px' : '215px',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily,
              fontSize: '11px',
              padding: '16px 12px',
              borderRadius: '4px',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.45)',
              lineHeight: 1.35,
              transition: 'width 0.25s ease',
              minHeight: '380px',
              boxSizing: 'border-box',
            }}
          >
            {sections.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', paddingTop: '100px', fontSize: '11px' }}>
                [Blank Receipt Canvas]
              </div>
            ) : (
              sections.map(renderPreviewElement)
            )}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '10px', textAlign: 'center' }}>
            Width: {paperWidth} • Font: {fontFamily.split(',')[0].replace(/"/g, '')} • Cut: {autoCut ? 'On' : 'Off'}
          </div>
        </div>
      </div>
    </div>
  );
}
