import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, Smartphone, Laptop, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'pill';
  showDetails?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'primary',
  showDetails = false,
}) => {
  const { isInstallable, isInstalled, isIOS, osName, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const { t } = useTranslation();

  if (isInstalled) {
    if (!showDetails) return null;
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
        <CheckCircle2 className="w-4 h-4" />
        <span>Proctus PWA Active</span>
      </div>
    );
  }

  const handleAction = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else if (isInstallable) {
      await install();
    } else {
      setShowIOSModal(true);
    }
  };

  const getLabel = () => {
    if (isIOS) return `Installer sur ${osName}`;
    if (osName === 'macOS' || osName === 'Windows') return `Installer sur ${osName}`;
    if (osName === 'Android') return `Installer l'application`;
    return t('common.install');
  };

  const buttonStyle =
    variant === 'primary'
      ? 'bg-[#0A1F44] hover:bg-[#132B5B] text-[#C9A227] border border-[#C9A227]/40 shadow-lg shadow-[#0A1F44]/20'
      : variant === 'pill'
      ? 'bg-[#C9A227] hover:bg-[#b58f1e] text-[#0A1F44] font-bold rounded-full'
      : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200';

  return (
    <>
      <button
        onClick={handleAction}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${buttonStyle} ${className}`}
        title="Installer Proctus en application native"
      >
        {isIOS ? (
          <Smartphone className="w-4 h-4 text-[#C9A227]" />
        ) : osName === 'macOS' || osName === 'Windows' ? (
          <Laptop className="w-4 h-4 text-[#C9A227]" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{getLabel()}</span>
      </button>

      {/* Guidance Modal for iOS or manual install */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131E35] p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-left relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#0A1F44] text-[#C9A227]">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0A1F44] dark:text-white">
                  Installation sur {osName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Accès instantané et mode hors-ligne sans passer par les stores
                </p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#C9A227] text-[#0A1F44] font-bold text-xs shrink-0">
                    1
                  </span>
                  <div>
                    Appuyez sur le bouton <strong>Partager</strong> <Share className="w-4 h-4 inline text-blue-500 mx-1" /> dans la barre inférieure de Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#C9A227] text-[#0A1F44] font-bold text-xs shrink-0">
                    2
                  </span>
                  <div>
                    Faites défiler vers le bas et touchez <strong>« Sur l'écran d'accueil »</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#C9A227] text-[#0A1F44] font-bold text-xs shrink-0">
                    3
                  </span>
                  <div>
                    Touchez <strong>Ajouter</strong> en haut à droite. Proctus apparaîtra comme une app native !
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  Pour installer Proctus sur votre navigateur ({osName}) :
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  Cliquez sur l'icône d'installation dans la barre d'adresse de votre navigateur (icône écran ou flèche ⤓) puis confirmez <strong>« Installer »</strong>.
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowIOSModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-semibold text-sm hover:bg-[#132B5B] transition cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
