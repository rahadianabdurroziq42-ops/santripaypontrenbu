import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Save, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  UserCheck, 
  Coins, 
  Eye,
  AlertCircle,
  Sparkles,
  FileText,
  RotateCcw
} from 'lucide-react';
import { PesantrenProfile } from '../types/finance';
import { defaultPesantrenProfile } from '../data/initialData';
import { formatRupiah } from '../utils/accounting';

interface ProfilPesantrenViewProps {
  pesantrenProfile: PesantrenProfile;
  onUpdateProfile: (newProfile: PesantrenProfile) => void | Promise<void>;
}

export const ProfilPesantrenView: React.FC<ProfilPesantrenViewProps> = ({
  pesantrenProfile,
  onUpdateProfile,
}) => {
  const [formData, setFormData] = useState<PesantrenProfile>({ ...pesantrenProfile });
  const [logoPreview, setLogoPreview] = useState<string | null>(pesantrenProfile.logoUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if pesantrenProfile prop changes from cloud snapshot or parent updates
  useEffect(() => {
    setFormData({ ...pesantrenProfile });
    setLogoPreview(pesantrenProfile.logoUrl || null);
  }, [pesantrenProfile]);

  // Client-side automatic image optimizer using HTML5 Canvas (resizes to max 256x256, keeps base64 under 50KB)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('File yang dipilih harus berupa file gambar (PNG, JPG, JPEG, WEBP, atau SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setImageError('Gagal membaca file gambar. Silakan coba file lain.');
    };

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        setImageError('Format file gambar tidak valid atau rusak.');
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original read string if 2D context is unavailable
            const rawUrl = event.target?.result as string;
            setLogoPreview(rawUrl);
            setFormData((prev) => ({ ...prev, logoUrl: rawUrl }));
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Produce a lightweight optimized PNG/JPEG
          const isTransparent = file.type === 'image/png' || file.type === 'image/webp';
          const optimizedBase64 = canvas.toDataURL(isTransparent ? 'image/png' : 'image/jpeg', 0.88);

          setLogoPreview(optimizedBase64);
          setFormData((prev) => ({ ...prev, logoUrl: optimizedBase64 }));
        } catch (err) {
          console.error('Image compression error:', err);
          const rawUrl = event.target?.result as string;
          setLogoPreview(rawUrl);
          setFormData((prev) => ({ ...prev, logoUrl: rawUrl }));
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData((prev) => {
      const next = { ...prev };
      delete next.logoUrl;
      return next;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetToDefault = () => {
    setFormData({ ...defaultPesantrenProfile });
    setLogoPreview(defaultPesantrenProfile.logoUrl || null);
    setImageError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      // Ensure daily limit is a valid number
      const sanitized: PesantrenProfile = {
        ...formData,
        defaultDailyLimit: Number(formData.defaultDailyLimit) || 10000,
      };

      if (!logoPreview) {
        delete sanitized.logoUrl;
      } else {
        sanitized.logoUrl = logoPreview;
      }

      await onUpdateProfile(sanitized);
      setSaveStatus({
        type: 'success',
        message: 'Profil, logo, dan rekening pesantren berhasil diperbarui & disinkronkan ke seluruh sistem!',
      });
      setTimeout(() => {
        setSaveStatus(null);
      }, 4000);
    } catch (err) {
      console.error('Save profile error:', err);
      setSaveStatus({
        type: 'error',
        message: 'Gagal menyimpan perubahan profil. Periksa koneksi data dan coba kembali.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Profil Lembaga & Pengaturan Logo Pesantren
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Identitas resmi pondok pesantren yang otomatis dicetak pada Kop Surat, Neraca, BKU, Rekening Koran, dan Struk Wadiah
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {saveStatus && (
            <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              saveStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              {saveStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{saveStatus.message}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Kembalikan form ke data bawaan simulasi"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Setelan Default</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Logo Upload & Live Kop Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Logo Upload Card */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Logo Resmi Pondok</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                PNG / JPG / WEBP
              </span>
            </div>

            {imageError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{imageError}</span>
              </div>
            )}

            <div className="flex flex-col items-center p-5 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
              {logoPreview ? (
                <div className="relative group flex flex-col items-center">
                  <div className="w-32 h-32 rounded-2xl bg-white p-3 shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden">
                    <img
                      src={logoPreview}
                      alt="Logo Pesantren"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      Ganti Logo
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-rose-200 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center text-center cursor-pointer py-3"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Klik untuk Unggah Logo Pesantren
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                    Gambar otomatis dikompresi agar ringan, responsif, dan siap cetak pada laporan A4/F4
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Live Kop Surat Preview */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 font-sans">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-emerald-700" />
              <span>Pratinjau Kop Surat Cetak (A4 / F4)</span>
            </h3>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 shadow-inner">
              <div className="flex items-center space-x-3 border-b-2 border-slate-900 pb-3">
                {logoPreview ? (
                  <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center shrink-0">
                    <img
                      src={logoPreview}
                      alt="Logo Kop"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-emerald-400 shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-arabic text-[11px] text-emerald-800 font-bold leading-tight">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                  <p className="font-black text-xs uppercase text-slate-900 truncate">
                    {formData.formalName || 'Nama Pondok Pesantren'}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate font-medium">
                    {formData.address || 'Alamat Pesantren'}, {formData.district}
                  </p>
                  <p className="text-[9px] text-slate-500 truncate">
                    Telp: {formData.phone} • Email: {formData.email}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                <FileText className="w-3 h-3 text-emerald-600" />
                <span>Format kop ini yang tercetak otomatis di Rekening Koran, Neraca & BKU</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Information Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Identitas Lembaga & Rekening Pesantren
            </h3>
            <span className="text-xs text-slate-400 font-medium">* Wajib diisi</span>
          </div>

          <div className="space-y-4">
            {/* Row 1: Nama Singkat & Formal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Singkat Lembaga *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Darul Ma'arif Syariah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Formal / Badan Pesantren *
                </label>
                <input
                  type="text"
                  required
                  value={formData.formalName || ''}
                  onChange={(e) => setFormData({ ...formData, formalName: e.target.value })}
                  placeholder="Contoh: Pondok Pesantren & Lembaga Muamalah Syariah Darul Ma'arif"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Row 2: Sub-judul Unit & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sub-Judul Unit Keuangan
                </label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Sistem Administrasi Kas Titipan Santri (Akad Wadiah Yad Dhamanah)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tagline / Visi Syariah
                </label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="Amanah, Transparan, Disiplin & Sesuai Syariat Islam"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>
            </div>

            {/* Row 3: Alamat & Wilayah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat Lengkap Pesantren
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Pesantren Luhur No. 99, Cibeber"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kabupaten / Kota & Kode Pos
                </label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Kabupaten Jombang, Jawa Timur 61419"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>
            </div>

            {/* Row 4: Kontak & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp Loket
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(0321) 865-9921 / WhatsApp: 0812-3456-7890"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email Resmi Bendahara
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="keuangan@darulmaarif-syariah.ponpes.id"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>
            </div>

            {/* Row 5: Rekening Bank Penampung Titipan (Transfer Via Bank) */}
            <div className="text-xs pt-1">
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Rekening Bank Penampung (Transfer Via Bank - Titipan Orang Tua)</span>
                <span className="text-[10px] text-emerald-700 font-semibold font-sans">Tampil di portal wali santri</span>
              </label>
              <input
                type="text"
                value={formData.bankAccountBSI || ''}
                onChange={(e) => setFormData({ ...formData, bankAccountBSI: e.target.value })}
                placeholder="Transfer Via Bank (Rek. 712-8899-001 a.n. Titipan Santri)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
              />
            </div>

            {/* Row 6: Mudir & Kepala Bendahara */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mudir / Pengasuh Pesantren (Tanda Tangan)
                </label>
                <input
                  type="text"
                  value={formData.mudir || ''}
                  onChange={(e) => setFormData({ ...formData, mudir: e.target.value })}
                  placeholder="K.H. Muhammad Syukron Ma'mun, Lc., M.A."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kepala Bendahara Pesantren (Tanda Tangan)
                </label>
                <input
                  type="text"
                  value={formData.headOfTreasury || ''}
                  onChange={(e) => setFormData({ ...formData, headOfTreasury: e.target.value })}
                  placeholder="Ust. H. Ahmad Fauzi, S.E.I., M.E.Sy."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>
            </div>

            {/* Row 7: NIP & Batas Default Uang Jajan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  NIP / Nomor Pegawai Bendahara
                </label>
                <input
                  type="text"
                  value={formData.treasuryNIP || ''}
                  onChange={(e) => setFormData({ ...formData, treasuryNIP: e.target.value })}
                  placeholder="NIP. 19840612.201001.1.003"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Batas Default Uang Jajan Harian (Rupiah)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.defaultDailyLimit || 10000}
                  onChange={(e) => setFormData({ ...formData, defaultDailyLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Row 8: Kalimat Semboyan / Ayat */}
            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">
                Semboyan / Ayat Al-Qur'an (Footer Laporan)
              </label>
              <input
                type="text"
                value={formData.motto || ''}
                onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                placeholder="Yarfa'ullahu Diini Amanu Mingkum Waddini Utulngilmu darojat"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Perubahan langsung tersimpan ke data offline dan server cloud realtime.
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all cursor-pointer ${
                isSaving
                  ? 'bg-emerald-800 opacity-70 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-600 active:scale-95'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Profil & Logo Pesantren'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
