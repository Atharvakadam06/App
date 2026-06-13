export const GOFILE_TOKEN = ''; // Add your Gofile API token for faster uploads

async function getBestServer() {
  try {
    const res = await fetch('https://api.gofile.io/servers');
    const data = await res.json();
    if (data.status === 'ok' && data.data?.servers?.length > 0) {
      return data.data.servers[0].name;
    }
    throw new Error('Failed to get Gofile server');
  } catch (serverError) {
    console.error('[Gofile] Server error, using fallback:', serverError);
    return 'store'; // fallback to default server
  }
}

export async function uploadToGofile(file) {
  const server = await getBestServer();
  const formData = new FormData();
  formData.append('file', file);
  if (GOFILE_TOKEN) {
    formData.append('token', GOFILE_TOKEN);
  }

  console.log('[Gofile] Uploading:', file.name, 'to', server);
  const res = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (data.status === 'ok') {
    const url = data.data.directLink || data.data.downloadPage;
    console.log('[Gofile] Upload success:', url);
    return url;
  }
  throw new Error(data.message || 'Upload failed');
}
