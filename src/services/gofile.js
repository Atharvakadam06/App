async function getBestServer() {
  const res = await fetch('https://api.gofile.io/servers');
  const data = await res.json();
  if (data.status === 'ok' && data.data?.servers?.length > 0) {
    return data.data.servers[0].name;
  }
  throw new Error('Failed to get Gofile server');
}

export async function uploadToGofile(file) {
  const server = await getBestServer();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (data.status === 'ok') {
    return data.data.downloadPage;
  }
  throw new Error(data.message || 'Upload failed');
}
