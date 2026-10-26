import { Tooltip } from "@excalidraw/excalidraw/components/Tooltip";
import { GithubIcon } from "@excalidraw/excalidraw/components/icons";
import { useI18n } from "@excalidraw/excalidraw/i18n";

export const EncryptedIcon = () => {
  const { t } = useI18n();

  return (
    <a
      className="encrypted-icon tooltip"
      href="https://github.com/s4rrar/0xBoard"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("sourcecode")}
    >
      <Tooltip label={t("sourcecode")} long={true}>
        {GithubIcon}
      </Tooltip>
    </a>
  );
};
