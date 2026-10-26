import React, { useEffect, useState } from "react";
import { APP_NAME } from "@excalidraw/common";
import { useI18n } from "@excalidraw/excalidraw/i18n";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { ExcalidrawLogo } from "@excalidraw/excalidraw/components/ExcalidrawLogo";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import {
  GithubIcon,
  TelegramIcon,
  InstagramIcon,
  LinkedinIcon,
} from "@excalidraw/excalidraw/components/icons";

import "./AboutDialog.scss";

interface AboutDialogProps {
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [version, setVersion] = useState("1.0.0");

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then((v) => {
        if (v) {
          setVersion(v);
        }
      });
    }
  }, []);

  return (
    <Dialog
      className="AboutDialog"
      size="small"
      onCloseRequest={onClose}
      title={t("aboutDialog.title", { appName: APP_NAME })}
    >
      <div className="AboutDialog__content">
        <div className="AboutDialog__brand">
          <ExcalidrawLogo size="large" withText />
          <div className="AboutDialog__version-pill">
            {t("aboutDialog.version")} {version}
          </div>
        </div>

        <p className="AboutDialog__desc">{t("aboutDialog.desc")}</p>

        <div className="AboutDialog__badge">
          <span className="AboutDialog__badge-dot" />
          {t("aboutDialog.privacy")}
        </div>

        <div className="AboutDialog__section">
          <div className="AboutDialog__section-label">
            {t("aboutDialog.developer")}: <strong>s4rrar</strong>
          </div>
          <div className="AboutDialog__socials">
            <a
              className="AboutDialog__social-btn"
              href="https://github.com/s4rrar/0xBoard"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="AboutDialog__social-icon">{GithubIcon}</div>
              GitHub
            </a>
            <a
              className="AboutDialog__social-btn"
              href="https://t.me/s4rrar"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="AboutDialog__social-icon">{TelegramIcon}</div>
              Telegram
            </a>
            <a
              className="AboutDialog__social-btn"
              href="https://instagram.com/s4rrar"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="AboutDialog__social-icon">{InstagramIcon}</div>
              Instagram
            </a>
            <a
              className="AboutDialog__social-btn"
              href="https://linkedin.com/in/s4rrar"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="AboutDialog__social-icon">{LinkedinIcon}</div>
              LinkedIn
            </a>
          </div>
        </div>

        <div className="AboutDialog__credits">
          <a
            href="https://github.com/excalidraw/excalidraw"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("aboutDialog.credits")}
          </a>
        </div>

        <div className="AboutDialog__footer">
          <FilledButton
            label={t("aboutDialog.close")}
            onClick={onClose}
            color="primary"
            variant="filled"
            size="medium"
          />
        </div>
      </div>
    </Dialog>
  );
};
