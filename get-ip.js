import os from 'os';

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Pular interfaces internas e IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getLocalIP();
console.log('\n🌐 CONFIGURAÇÃO PARA ACESSO PELA REDE LOCAL');
console.log('='.repeat(50));
console.log(`📱 IP da sua máquina: ${ip}`);
console.log(`🖥️  Frontend: http://${ip}:5173`);
console.log(`🔧 Backend: http://${ip}:3001/api`);
console.log('\n📋 PASSOS PARA CONFIGURAR:');
console.log('1. Certifique-se que o firewall permite conexões nas portas 3001 e 5173');
console.log('2. No celular, acesse: http://' + ip + ':5173');
console.log('3. Se não funcionar, edite o arquivo .env.local e descomente:');
console.log(`   VITE_API_URL=http://${ip}:3001/api`);
console.log('\n🔥 Reinicie o frontend (npm run dev) após alterar .env.local');
