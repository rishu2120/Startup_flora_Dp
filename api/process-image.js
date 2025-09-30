export default function handler(req, res) {
  if (req.method === 'POST') {
    const body = req.body;
    // yahan pe image processing ya kuch bhi karo
    res.status(200).json({ message: 'Image processed successfully!' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
