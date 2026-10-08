export const appMeta = {
  name: "APP_TAG",
  title: "APP_NAME",
  icon: "PATH_TO_ICON",
};

export function appInit(shell) {
  // INIT_PROCEXX
  const root = document.getElementById("app-root");
  if (!root) {
    console.error("ChatApp: #app-rootが見つかりません");
    return;
  }
  root.innerHTML = `APP_HTML`;
  //APP_PROCESS
}
