const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { auth } = require('../middleware/auth');
const sharp = require('sharp');
const User = require('../models/User');

const router = express.Router();

// Todas as rotas aqui exigem auth
router.use(auth);

// Obter perfil do usuário atual
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    // Se armazenamos caminho relativo de uploads, devolver URL absoluta para o cliente
    const normalizedAvatarUrl = (typeof user.avatarUrl === 'string' && user.avatarUrl.startsWith('/uploads/'))
      ? `${req.protocol}://${req.get('host')}${user.avatarUrl}`
      : user.avatarUrl;

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.permissions,
      avatarUrl: normalizedAvatarUrl,
      status: user.status,
      last_login: user.last_login,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar nome e avatar do usuário atual
router.put('/', async (req, res) => {
  try {
    const user = req.user;
    const { name, avatarUrl } = req.body || {};

    if (typeof name === 'string') user.name = name.trim();
    if (typeof avatarUrl === 'string') {
      const trimmed = avatarUrl.trim();
      // Se for uma URL absoluta do próprio servidor, armazena apenas o caminho relativo
      try {
        const url = new URL(trimmed);
        if (url.pathname && url.pathname.startsWith('/uploads/')) {
          user.avatarUrl = url.pathname;
        } else {
          user.avatarUrl = trimmed; // pode ser Data URL (base64) ou URL externa
        }
      } catch (_) {
        // Não é URL absoluta; se começar com /uploads, mantém relativo; caso contrário salva como veio
        user.avatarUrl = trimmed;
      }
    }

    await user.save();

    const normalizedAvatarUrl = (typeof user.avatarUrl === 'string' && user.avatarUrl.startsWith('/uploads/'))
      ? `${req.protocol}://${req.get('host')}${user.avatarUrl}`
      : user.avatarUrl;

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.permissions,
      avatarUrl: normalizedAvatarUrl,
      status: user.status,
      last_login: user.last_login,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações PIX do usuário atual
router.put('/pix', async (req, res) => {
  try {
    const user = req.user;
    const { pix_key, pix_key_type, pix_merchant_name, pix_merchant_city } = req.body || {};

    if (typeof pix_key === 'string') user.pix_key = pix_key.trim();
    if (typeof pix_key_type === 'string') user.pix_key_type = pix_key_type;
    if (typeof pix_merchant_name === 'string') user.pix_merchant_name = pix_merchant_name.trim();
    if (typeof pix_merchant_city === 'string') user.pix_merchant_city = pix_merchant_city.trim();

    await user.save();

    res.json({
      id: user._id,
      pix_key: user.pix_key,
      pix_key_type: user.pix_key_type,
      pix_merchant_name: user.pix_merchant_name,
      pix_merchant_city: user.pix_merchant_city,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Erro ao atualizar PIX do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar senha do usuário atual
router.put('/password', async (req, res) => {
  try {
    // Carregar usuário completo (inclui hash da senha), pois o auth remove o campo password
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    user.password = newPassword;
    await user.save(); // pre('save') fará o hash

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

// Configuração de upload após export (para manter organização do arquivo)

// Garante diretório de destino
function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (_) {}
}

const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
ensureDir(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '') || '.png';
    const safeExt = ext.toLowerCase();
    const name = `${req.user?._id || 'user'}-${Date.now()}${safeExt}`;
    cb(null, name);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Tipo de arquivo inválido. Envie uma imagem JPG, PNG, GIF ou WEBP.'));
};

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// Rota para enviar avatar (multipart/form-data com campo "avatar")
router.put('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de imagem é obrigatório' });
    }
    // Pós-processa a imagem para garantir qualidade consistente (256x256, crop central, WebP)
    const inputPath = req.file.path;
    const baseName = path.basename(req.file.filename, path.extname(req.file.filename));
    const outputName = `${baseName}.webp`;
    const outputPath = path.join(uploadDir, outputName);

    try {
      await sharp(inputPath)
        .rotate()
        // Gera um avatar maior (512px) para ótima nitidez em telas de alta densidade
        .resize(512, 512, { fit: 'cover', position: 'center', withoutEnlargement: true })
        // Ajusta nitidez leve para melhorar detalhamento em tamanhos pequenos
        .sharpen()
        // WebP lossless para máxima qualidade (tamanho de arquivo maior, mas ótimo para avatar)
        .webp({ lossless: true, effort: 5 })
        .toFile(outputPath);
      // Remove arquivo original
      try { fs.unlinkSync(inputPath); } catch (_) {}
    } catch (imgErr) {
      console.error('Falha ao processar avatar com sharp:', imgErr);
      // Fallback: usa arquivo original
      const fallbackPath = `/uploads/avatars/${req.file.filename}`;
      const user = req.user;
      user.avatarUrl = fallbackPath; // armazena caminho relativo
      await user.save();
      return res.json({ message: 'Avatar atualizado (sem processamento de imagem)', avatarUrl: `${req.protocol}://${req.get('host')}${fallbackPath}` });
    }

    const publicPath = `/uploads/avatars/${outputName}`;
    const user = req.user;
    user.avatarUrl = publicPath; // armazena caminho relativo
    await user.save();
    return res.json({ message: 'Avatar atualizado com sucesso', avatarUrl: `${req.protocol}://${req.get('host')}${publicPath}` });
  } catch (error) {
    console.error('Erro ao enviar avatar:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
