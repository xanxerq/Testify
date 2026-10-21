import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Building,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Briefcase,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { User } from '../types';
import { authService } from '../services/authService';
import { getPocketBaseUrl } from '../services/pocketbase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onProfileUpdated: (updatedUser: User) => void;
}

const COMMON_DEPARTMENTS = [
  'Matemáticas',
  'Lengua Castellana y Literatura',
  'Ciencias de la Naturaleza / Biología',
  'Física y Química',
  'Geografía e Historia',
  'Inglés / Idiomas Modernos',
  'Tecnología e Informática',
  'Filosofía',
  'Educación Física',
  'Música',
  'Educación Plástica y Visual',
  'Orientación Educativa',
];

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherAlex',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=ProfesorElena',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=DocenteDavid',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=EstudianteSara',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=AlumnoLucas',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=MariaCiencias',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=JavierLetras',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=CarmenBio',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'account'>('profile');

  // Form states for profile
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [avatar, setAvatar] = useState('');

  // Form states for password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status feedback
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize data when modal opens or user changes
  useEffect(() => {
    if (currentUser && isOpen) {
      setName(currentUser.name || '');
      setInstitution(currentUser.institution || '');
      setDepartment(currentUser.department || currentUser.subjectArea || '');
      setAvatar(currentUser.avatar || '');
      setOldPassword('');
      setNewPassword('');
      setPasswordConfirm('');
      setSuccessToast(null);
      setErrorMessage(null);
    }
  }, [currentUser, isOpen]);

  // Auto-dismiss success toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  if (!isOpen || !currentUser) return null;

  const isTeacher = currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin' || authService.isAdminEmail(currentUser.email);
  const isTeacherOrAdmin = isTeacher || isAdmin;
  const pbUrl = getPocketBaseUrl();

  // Handle saving general profile information
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Por favor, introduce tu nombre completo.');
      return;
    }

    try {
      setIsSavingProfile(true);
      const updated = await authService.updateUserProfile({
        name: name.trim(),
        institution: institution.trim(),
        // Only teachers or admins have a department
        department: isTeacherOrAdmin ? department.trim() : undefined,
        avatar: avatar || currentUser.avatar,
      });

      onProfileUpdated(updated);
      setSuccessToast('¡Perfil actualizado con éxito en la base de datos!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los datos del perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle saving new password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener como mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== passwordConfirm) {
      setErrorMessage('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    try {
      setIsSavingPassword(true);
      const res = await authService.updateUserPassword({
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim(),
        passwordConfirm: passwordConfirm.trim(),
      });

      setSuccessToast(res.message || '¡Contraseña actualizada con éxito!');
      setOldPassword('');
      setNewPassword('');
      setPasswordConfirm('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Generate random avatar
  const handleRandomAvatar = () => {
    const randomSeed = `Seed_${Math.random().toString(36).substring(2, 9)}`;
    const newAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
    setAvatar(newAvatarUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-8">
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name || currentUser.name}
                  className="w-16 h-16 rounded-2xl bg-white/10 p-0.5 border-2 border-white/20 object-cover shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 border-2 border-white/20 text-white flex items-center justify-center text-xl font-bold shadow-md">
                  {(name || currentUser.name).charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight truncate">
                  {name || currentUser.name}
                </h2>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    Admin
                  </span>
                ) : isTeacher ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-violet-400/20 text-violet-300 border border-violet-400/40 px-2 py-0.5 rounded-full">
                    <GraduationCap className="w-3 h-3" />
                    Profesorado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-indigo-400/20 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded-full">
                    <UserIcon className="w-3 h-3" />
                    Estudiante
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-mono mt-1 truncate">
                {currentUser.email}
              </p>
              {institution && (
                <p className="text-xs text-indigo-200/90 flex items-center gap-1 mt-0.5">
                  <Building className="w-3 h-3 text-indigo-300 shrink-0" />
                  <span className="truncate">{institution}</span>
                  {isTeacherOrAdmin && department && (
                    <span className="text-slate-400">• {department}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5 border-b border-white/10 -mb-5 sm:-mb-6 overflow-x-auto pb-0">
            <button
              onClick={() => {
                setActiveTab('profile');
                setErrorMessage(null);
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'profile'
                  ? 'border-indigo-400 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Editar Perfil</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('password');
                setErrorMessage(null);
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'password'
                  ? 'border-indigo-400 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Cambiar Contraseña</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('account');
                setErrorMessage(null);
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'account'
                  ? 'border-indigo-400 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Detalles de Cuenta</span>
            </button>
          </div>
        </div>

        {/* Global Alert / Toast Notifications */}
        {successToast && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs sm:text-sm font-semibold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2 text-xs sm:text-sm font-semibold animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/60">
          {/* TAB 1: EDITAR PERFIL */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                  Información Personal y Centro
                </h3>

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Tu nombre y apellidos"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Instituto / Centro Educativo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Instituto o Centro Educativo</span>
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ej. IES Severo Ochoa, Colegio Santa María..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Aparecerá en los encabezados oficiales de los exámenes y evaluaciones que generes.
                  </p>
                </div>

                {/* DEPARTAMENTO: SOLO SI ERES PROFE O ADMIN */}
                {isTeacherOrAdmin ? (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-violet-600" />
                        <span>Departamento / Especialidad Didáctica (Solo Docentes)</span>
                      </label>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200">
                        Exclusivo Profe
                      </span>
                    </div>

                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Ej. Matemáticas, Lengua Castellana, Biología..."
                      className="w-full px-3.5 py-2.5 bg-violet-50/40 border border-violet-200 rounded-xl text-sm font-medium text-violet-950 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                    />

                    {/* Presets rápidos de departamentos */}
                    <div className="mt-2.5">
                      <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                        Sugerencias rápidas de departamento:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_DEPARTMENTS.map((dept) => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => setDepartment(dept)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                              department === dept
                                ? 'bg-violet-600 text-white border-violet-600 font-bold shadow-2xs'
                                : 'bg-slate-100/80 hover:bg-violet-100 text-slate-700 hover:text-violet-900 border-slate-200'
                            }`}
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Información informativa para cuentas de estudiante: el departamento está oculto para ellos */
                  <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      La sección de <strong>Departamento Didáctico</strong> solo está disponible para cuentas con rol de <strong>Profesor / Docente</strong>. Tu rol actual es <strong>Estudiante</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* Selector de Avatar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Avatar / Imagen de Perfil
                  </h3>
                  <button
                    type="button"
                    onClick={handleRandomAvatar}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200/80 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generar Aleatorio
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`relative p-1 rounded-xl border-2 transition-all cursor-pointer ${
                        avatar === url
                          ? 'border-indigo-600 bg-indigo-50 scale-105 shadow-xs'
                          : 'border-slate-200 hover:border-indigo-300 bg-slate-50'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Avatar ${idx + 1}`}
                        className="w-full h-11 object-cover rounded-lg"
                      />
                      {avatar === url && (
                        <div className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white rounded-full p-0.5 shadow-2xs">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save profile button */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CAMBIAR CONTRASEÑA */}
          {activeTab === 'password' && (
            <form onSubmit={handleSavePassword} className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Actualizar Contraseña de Acceso
                    </h3>
                    <p className="text-xs text-slate-500">
                      Modifica tu clave de inicio de sesión en tu servidor PocketBase.
                    </p>
                  </div>
                </div>

                {/* Contraseña Actual */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Introduce tu contraseña actual"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showOldPass ? 'Ocultar' : 'Mostrar'}
                    >
                      {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Nueva Contraseña */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nueva Contraseña (mínimo 6 caracteres) *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Mínimo 6 caracteres seguros"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showNewPass ? 'Ocultar' : 'Mostrar'}
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength indicators */}
                  {newPassword && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            newPassword.length < 6
                              ? 'w-1/4 bg-rose-500'
                              : newPassword.length < 9
                              ? 'w-2/4 bg-amber-500'
                              : 'w-full bg-emerald-500'
                          }`}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {newPassword.length < 6
                          ? 'Corta (<6)'
                          : newPassword.length < 9
                          ? 'Aceptable'
                          : 'Segura'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirmar Nueva Contraseña */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirmar Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                      placeholder="Vuelve a escribir la nueva contraseña"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showConfirmPass ? 'Ocultar' : 'Mostrar'}
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordConfirm && newPassword !== passwordConfirm && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">
                      Las contraseñas no coinciden.
                    </p>
                  )}
                </div>
              </div>

              {/* Submit password button */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword || !newPassword || newPassword !== passwordConfirm}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-amber-200 transition-all cursor-pointer"
                >
                  {isSavingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Actualizar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: DETALLES DE CUENTA */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Estado de Cuenta y Servidor
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-semibold block mb-0.5">Identificador de Usuario (ID)</span>
                    <span className="font-mono text-slate-800 break-all">{currentUser.id}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-semibold block mb-0.5">Correo Electrónico</span>
                    <span className="font-semibold text-slate-800 break-all">{currentUser.email}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-semibold block mb-0.5">Rol Actual</span>
                    <div className="mt-1">
                      {isAdmin ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                          Administrador / Superadmin
                        </span>
                      ) : isTeacher ? (
                        <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-900 border border-violet-300 font-bold">
                          Profesor / Docente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                          Estudiante
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-semibold block mb-0.5">Centro Educativo</span>
                    <span className="font-semibold text-slate-800">
                      {currentUser.institution || 'No especificado'}
                    </span>
                  </div>

                  {isTeacherOrAdmin && (
                    <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-200 sm:col-span-2">
                      <span className="text-violet-700 font-bold block mb-0.5">Departamento Docente</span>
                      <span className="font-semibold text-violet-950">
                        {currentUser.department || currentUser.subjectArea || 'Sin departamento asignado'}
                      </span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                    <span className="text-slate-400 font-semibold block mb-0.5">Base de Datos Conectada</span>
                    <span className="font-mono text-slate-700 text-[11px] break-all">
                      {pbUrl || 'Servidor local predeterminado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
