// Este arquivo informa ao TypeScript que "Playerjs" existe na janela do navegador
declare global {
  interface Window {
    Playerjs: any; // Define Playerjs no objeto window
  }
}
export {};