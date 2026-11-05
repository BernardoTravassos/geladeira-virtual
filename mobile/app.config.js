/**
 * Complementa o app.json com valores que mudam por ambiente.
 *
 * API_URL define o endereço do backend para quem NÃO está na rede local — por
 * exemplo o seu cliente, que acessa por um túnel HTTPS:
 *
 *   API_URL=https://algo.trycloudflare.com npx expo start --tunnel
 *
 * Sem API_URL, o app descobre sozinho o endereço do seu PC (só funciona com o
 * celular na mesma rede Wi-Fi). Ver descobrirEnderecoApi em src/services/api.ts.
 *
 * O valor é lido quando o Expo inicia ou publica, e vai para dentro do app:
 * trocar o túnel exige reiniciar (ou republicar).
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: process.env.API_URL || undefined,
  },
});
