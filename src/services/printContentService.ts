// Print Content Service - Generates formatted content for thermal printing
// Includes: Company copy, Client copy with signature, and Checklist

export interface PrintOrderData {
  orderNumber: string;
  clientName: string;
  clientPhone: string;
  clientCpf?: string;
  clientAddress?: string;
  brand: string;
  model: string;
  deviceColor: string;
  problemDescription: string;
  possibleService: string;
  accessories: string;
  physicalCondition: string;
  passwordType: string;
  passwordValue?: string;
  serviceValue: number;
  entryValue: number;
  remainingValue: number;
  estimatedDelivery?: string;
  observations?: string;
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  storeCnpj?: string;
  attendantName: string;
  createdAt: string;
  terms?: string[];
  checklistType?: 'android' | 'ios' | null;
  checklistData?: Record<string, string> | null;
}

const LINE = '----------------------------------------';
const DOUBLE_LINE = '========================================';

const STATUS_LABELS: Record<string, string> = {
  working: 'Funcionando',
  defective: 'Com Defeito',
  not_tested: 'Nao Testado',
  not_available: 'Nao Possui',
};

const ANDROID_CHECKLIST_LABELS: Record<string, string> = {
  screen: 'Tela/Display',
  touch: 'Touch Screen',
  speaker: 'Alto-falante',
  earpiece: 'Auricular',
  microphone: 'Microfone',
  camera_front: 'Camera Frontal',
  camera_back: 'Camera Traseira',
  wifi: 'Wi-Fi',
  bluetooth: 'Bluetooth',
  mobile_data: 'Dados Moveis',
  charging: 'Carregamento',
  battery: 'Bateria',
  fingerprint: 'Biometria/Digital',
  buttons_volume: 'Botoes Volume',
  button_power: 'Botao Power',
  sim_tray: 'Bandeja Chip',
  sim_card: 'Leitura Chip',
  vibration: 'Vibracao',
  proximity_sensor: 'Sensor Proximidade',
  gyroscope: 'Giroscopio',
  gps: 'GPS',
  nfc: 'NFC',
  flash: 'Flash',
  sd_card: 'Slot SD Card',
};

const IOS_CHECKLIST_LABELS: Record<string, string> = {
  screen: 'Tela/Display',
  touch: 'Touch Screen',
  '3d_touch': '3D Touch/Haptic',
  face_id: 'Face ID',
  touch_id: 'Touch ID',
  speaker: 'Alto-falante',
  earpiece: 'Auricular',
  microphone: 'Microfone',
  camera_front: 'Camera TrueDepth',
  camera_back: 'Camera Traseira',
  camera_ultrawide: 'Camera Ultra Angular',
  lidar: 'Scanner LiDAR',
  wifi: 'Wi-Fi',
  bluetooth: 'Bluetooth',
  mobile_data: 'Dados Moveis',
  charging: 'Carregamento',
  wireless_charging: 'Carga Sem Fio',
  battery: 'Bateria',
  buttons_volume: 'Botoes Volume',
  button_power: 'Botao Lateral',
  silent_switch: 'Chave Silencio',
  sim_tray: 'Bandeja Chip',
  sim_card: 'Leitura Chip/eSIM',
  vibration: 'Taptic Engine',
  proximity_sensor: 'Sensor Proximidade',
  gyroscope: 'Giroscopio',
  gps: 'GPS',
  nfc: 'NFC/Apple Pay',
  flash: 'Flash True Tone',
  truetone_display: 'True Tone Display',
};

const PASSWORD_TYPE_LABELS: Record<string, string> = {
  none: 'Sem Senha',
  pin: 'PIN',
  password: 'Senha Alfanumerica',
  pattern: 'Padrao (Pontos)',
};

// Generate pattern drawing for pattern passwords
const generatePatternGrid = (): string => {
  // Simple 3x3 pattern grid representation
  return `
    [1]---[2]---[3]
     |     |     |
    [4]---[5]---[6]
     |     |     |
    [7]---[8]---[9]
`;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString('pt-BR');
  } catch {
    return dateString;
  }
};

// Generate company/store copy
export const generateCompanyCopy = (order: PrintOrderData): string => {
  let content = '';
  
  // Header
  content += `${DOUBLE_LINE}\n`;
  content += `          ${order.storeName.toUpperCase()}\n`;
  if (order.storePhone) content += `          Tel: ${order.storePhone}\n`;
  if (order.storeAddress) content += `    ${order.storeAddress}\n`;
  if (order.storeCnpj) content += `          CNPJ: ${order.storeCnpj}\n`;
  content += `${DOUBLE_LINE}\n`;
  content += `        *** VIA DA EMPRESA ***\n`;
  content += `${DOUBLE_LINE}\n`;
  content += `         ORDEM DE SERVICO\n`;
  content += `             #${order.orderNumber}\n`;
  content += `${DOUBLE_LINE}\n\n`;
  
  // Client info
  content += `DADOS DO CLIENTE\n`;
  content += `${LINE}\n`;
  content += `Nome: ${order.clientName}\n`;
  content += `Telefone: ${order.clientPhone}\n`;
  if (order.clientCpf) content += `CPF: ${order.clientCpf}\n`;
  if (order.clientAddress) content += `Endereco: ${order.clientAddress}\n`;
  content += `\n`;
  
  // Device info
  content += `DADOS DO APARELHO\n`;
  content += `${LINE}\n`;
  content += `Marca: ${order.brand}\n`;
  content += `Modelo: ${order.model}\n`;
  content += `Cor: ${order.deviceColor}\n`;
  content += `Acessorios: ${order.accessories || 'Nenhum'}\n`;
  content += `Condicao Fisica: ${order.physicalCondition || 'Nao informado'}\n`;
  content += `\n`;
  
  // Problem and service
  content += `PROBLEMA/SERVICO\n`;
  content += `${LINE}\n`;
  content += `Problema: ${order.problemDescription}\n`;
  content += `Servico: ${order.possibleService || 'A definir'}\n`;
  content += `\n`;
  
  // Password
  content += `SENHA DO APARELHO\n`;
  content += `${LINE}\n`;
  const passwordLabel = PASSWORD_TYPE_LABELS[order.passwordType] || order.passwordType;
  content += `Tipo: ${passwordLabel}\n`;
  if (order.passwordType === 'pattern') {
    content += `Padrao: ${generatePatternGrid()}\n`;
  } else if (order.passwordValue) {
    content += `Senha: ${order.passwordValue}\n`;
  }
  content += `\n`;
  
  // Values
  content += `VALORES\n`;
  content += `${LINE}\n`;
  content += `Valor do Servico: ${formatCurrency(order.serviceValue)}\n`;
  content += `Valor de Entrada: ${formatCurrency(order.entryValue)}\n`;
  content += `Valor Restante: ${formatCurrency(order.remainingValue)}\n`;
  content += `\n`;
  
  // Delivery
  if (order.estimatedDelivery) {
    content += `PREVISAO DE ENTREGA\n`;
    content += `${LINE}\n`;
    content += `${formatDate(order.estimatedDelivery)}\n\n`;
  }
  
  // Observations
  if (order.observations) {
    content += `OBSERVACOES\n`;
    content += `${LINE}\n`;
    content += `${order.observations}\n\n`;
  }
  
  // Footer
  content += `${DOUBLE_LINE}\n`;
  content += `Data: ${formatDate(order.createdAt)}\n`;
  content += `Atendente: ${order.attendantName}\n`;
  content += `${DOUBLE_LINE}\n\n\n`;
  
  return content;
};

// Generate client copy with signature field
export const generateClientCopy = (order: PrintOrderData): string => {
  let content = '';
  
  // Header
  content += `${DOUBLE_LINE}\n`;
  content += `          ${order.storeName.toUpperCase()}\n`;
  if (order.storePhone) content += `          Tel: ${order.storePhone}\n`;
  if (order.storeAddress) content += `    ${order.storeAddress}\n`;
  if (order.storeCnpj) content += `          CNPJ: ${order.storeCnpj}\n`;
  content += `${DOUBLE_LINE}\n`;
  content += `        *** VIA DO CLIENTE ***\n`;
  content += `${DOUBLE_LINE}\n`;
  content += `         ORDEM DE SERVICO\n`;
  content += `             #${order.orderNumber}\n`;
  content += `${DOUBLE_LINE}\n\n`;
  
  // Client info
  content += `DADOS DO CLIENTE\n`;
  content += `${LINE}\n`;
  content += `Nome: ${order.clientName}\n`;
  content += `Telefone: ${order.clientPhone}\n`;
  if (order.clientCpf) content += `CPF: ${order.clientCpf}\n`;
  content += `\n`;
  
  // Device info
  content += `DADOS DO APARELHO\n`;
  content += `${LINE}\n`;
  content += `Marca: ${order.brand}\n`;
  content += `Modelo: ${order.model}\n`;
  content += `Cor: ${order.deviceColor}\n`;
  content += `Acessorios: ${order.accessories || 'Nenhum'}\n`;
  content += `\n`;
  
  // Problem
  content += `PROBLEMA RELATADO\n`;
  content += `${LINE}\n`;
  content += `${order.problemDescription}\n\n`;
  
  // Values
  content += `VALORES\n`;
  content += `${LINE}\n`;
  content += `Valor do Servico: ${formatCurrency(order.serviceValue)}\n`;
  content += `Valor de Entrada: ${formatCurrency(order.entryValue)}\n`;
  content += `Valor Restante: ${formatCurrency(order.remainingValue)}\n`;
  content += `\n`;
  
  // Delivery
  if (order.estimatedDelivery) {
    content += `PREVISAO DE ENTREGA\n`;
    content += `${LINE}\n`;
    content += `${formatDate(order.estimatedDelivery)}\n\n`;
  }
  
  // Terms and conditions
  if (order.terms && order.terms.length > 0) {
    content += `TERMOS E CONDICOES\n`;
    content += `${LINE}\n`;
    order.terms.forEach((term, index) => {
      content += `${index + 1}. ${term}\n`;
    });
    content += `\n`;
  }
  
  // Signature area
  content += `${DOUBLE_LINE}\n`;
  content += `\n`;
  content += `ASSINATURA DO CLIENTE:\n`;
  content += `\n`;
  content += `\n`;
  content += `${LINE}\n`;
  content += `${order.clientName}\n`;
  content += `\n`;
  
  // Footer
  content += `${DOUBLE_LINE}\n`;
  content += `Data: ${formatDate(order.createdAt)}\n`;
  content += `Atendente: ${order.attendantName}\n`;
  content += `${DOUBLE_LINE}\n\n\n`;
  
  return content;
};

// Generate checklist
export const generateChecklistCopy = (order: PrintOrderData): string => {
  if (!order.checklistType || !order.checklistData) {
    return '';
  }
  
  let content = '';
  const labels = order.checklistType === 'ios' ? IOS_CHECKLIST_LABELS : ANDROID_CHECKLIST_LABELS;
  
  // Header
  content += `${DOUBLE_LINE}\n`;
  content += `        CHECKLIST DE ENTRADA\n`;
  content += `     O.S. #${order.orderNumber}\n`;
  content += `${DOUBLE_LINE}\n`;
  content += `Sistema: ${order.checklistType.toUpperCase()}\n`;
  content += `Aparelho: ${order.brand} ${order.model}\n`;
  content += `Cliente: ${order.clientName}\n`;
  content += `${LINE}\n\n`;
  
  // Checklist items
  content += `ITENS VERIFICADOS\n`;
  content += `${LINE}\n`;
  
  Object.entries(order.checklistData).forEach(([key, value]) => {
    const label = labels[key] || key;
    const statusLabel = STATUS_LABELS[value] || value;
    
    // Add indicator based on status
    let indicator = '[ ]';
    if (value === 'working') indicator = '[OK]';
    else if (value === 'defective') indicator = '[X]';
    else if (value === 'not_available') indicator = '[--]';
    else if (value === 'not_tested') indicator = '[?]';
    
    content += `${indicator} ${label}: ${statusLabel}\n`;
  });
  
  content += `\n`;
  content += `${LINE}\n`;
  content += `LEGENDA:\n`;
  content += `[OK] Funcionando\n`;
  content += `[X] Com Defeito\n`;
  content += `[?] Nao Testado\n`;
  content += `[--] Nao Possui\n`;
  content += `${LINE}\n\n`;
  
  // Footer
  content += `${DOUBLE_LINE}\n`;
  content += `Data: ${formatDate(order.createdAt)}\n`;
  content += `Atendente: ${order.attendantName}\n`;
  content += `${DOUBLE_LINE}\n\n\n`;
  
  return content;
};

// Generate full print content (all copies)
export const generateFullPrintContent = (order: PrintOrderData): string => {
  let content = '';
  
  // Company copy
  content += generateCompanyCopy(order);
  
  // Client copy with signature
  content += generateClientCopy(order);
  
  // Checklist (if available)
  const checklist = generateChecklistCopy(order);
  if (checklist) {
    content += checklist;
  }
  
  return content;
};
