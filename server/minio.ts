import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações do MinIO S3
const endpoint = process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT || 'http://localhost:9000';
const port = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : undefined;
const useSSL = process.env.MINIO_USE_SSL === 'true';
const accessKeyId = process.env.MINIO_ACCESS_KEY || process.env.S3_ACCESS_KEY || 'minioadmin';
const secretAccessKey = process.env.MINIO_SECRET_KEY || process.env.S3_SECRET_KEY || 'minioadmin';
const bucketName = process.env.MINIO_BUCKET || process.env.S3_BUCKET || 'notas-fiscais';

function buildMinioEndpoint(): string {
  let ep = endpoint;
  if (!ep.startsWith('http://') && !ep.startsWith('https://')) {
    ep = (useSSL ? 'https://' : 'http://') + ep;
  }
  if (port && !ep.includes(`:${port}`)) {
    try {
      const u = new URL(ep);
      u.port = String(port);
      return u.toString();
    } catch {
      return `${ep}:${port}`;
    }
  }
  return ep;
}

const s3Client = new S3Client({
  endpoint: buildMinioEndpoint(),
  region: 'us-east-1',
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true, // Essencial para MinIO
});

// Pasta de contingência local se o MinIO estiver indisponível no ambiente de dev
const localUploadsDir = path.resolve(__dirname, '../public/uploads/invoices');
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

let bucketEnsured = false;
async function ensureBucket() {
  if (bucketEnsured) return;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    bucketEnsured = true;
  } catch (err: any) {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      bucketEnsured = true;
      console.log(`[MinIO] Bucket '${bucketName}' verificado/criado com sucesso.`);
    } catch (createErr: any) {
      console.warn(`[MinIO] Aviso ao verificar/criar bucket '${bucketName}':`, createErr.message);
    }
  }
}

export async function uploadToMinio(
  fileBuffer: Buffer,
  originalFilename: string,
  contentType: string,
  requestId: string
): Promise<{ key: string; url: string; size: number }> {
  const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `invoices/${requestId}/${Date.now()}_${sanitizedName}`;

  try {
    await ensureBucket();
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType || 'application/octet-stream',
    }));
    console.log(`[MinIO] Arquivo enviado com sucesso ao MinIO: ${key} (${fileBuffer.length} bytes)`);
    return {
      key,
      url: `/api/invoices/file?key=${encodeURIComponent(key)}&name=${encodeURIComponent(originalFilename)}`,
      size: fileBuffer.length,
    };
  } catch (err: any) {
    console.warn(`[MinIO] MinIO inacessível no momento (${err.message}). Armazenando em contingência local.`);
    const localFilename = `${Date.now()}_${sanitizedName}`;
    const localFilePath = path.join(localUploadsDir, localFilename);
    fs.writeFileSync(localFilePath, fileBuffer);
    return {
      key: `local:${localFilename}`,
      url: `/api/invoices/file?key=${encodeURIComponent(`local:${localFilename}`)}&name=${encodeURIComponent(originalFilename)}`,
      size: fileBuffer.length,
    };
  }
}

export async function getFromMinio(key: string): Promise<{ stream?: any; buffer?: Buffer; contentType?: string }> {
  if (key.startsWith('local:')) {
    const localFilename = key.replace('local:', '');
    const localFilePath = path.join(localUploadsDir, localFilename);
    if (fs.existsSync(localFilePath)) {
      const buffer = fs.readFileSync(localFilePath);
      return { buffer };
    }
    throw new Error('Arquivo de contingência local não encontrado.');
  }

  try {
    const res = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    return {
      stream: res.Body,
      contentType: res.ContentType,
    };
  } catch (err: any) {
    console.error(`[MinIO] Erro ao recuperar arquivo ${key}:`, err.message);
    throw err;
  }
}

export async function deleteFromMinio(key: string): Promise<boolean> {
  if (key.startsWith('local:')) {
    const localFilename = key.replace('local:', '');
    const localFilePath = path.join(localUploadsDir, localFilename);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return true;
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    return true;
  } catch (err: any) {
    console.warn(`[MinIO] Erro ao excluir do MinIO ${key}:`, err.message);
    return false;
  }
}
