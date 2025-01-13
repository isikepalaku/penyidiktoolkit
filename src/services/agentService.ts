const API_KEY = "phi-oHzWmyg4SJ6jOI29Fg15iQhABYWqhNeM-zmrNxbkgwo";
const API_URL = "http://localhost:8000";

interface AgentResponse {
  content: string;
}

type MessageType = string | File;

export const submitImageAnalysis = async (
  imageFile: File, 
  description?: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('uploaded_file', imageFile);
  
  if (description) {
    formData.append('description', description);
  }

  const response = await fetch(`${API_URL}/v1/analyze-image`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await parseAgentResponse(response);
  return result;
};

export const submitAgentAnalysis = async (
  message: string,
  agentType: string
): Promise<string> => {
  const agentId = getAgentId(agentType);
  
  const payload = {
    message,
    agent_id: agentId,
    stream: false,
    monitor: false
  };

  const response = await fetch(`${API_URL}/v1/playground/agent/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await parseAgentResponse(response);
  return result;
};

const parseAgentResponse = async (response: Response): Promise<string> => {
  const text = await response.text();
  try {
    const parsedResponse = JSON.parse(text);
    if (typeof parsedResponse === 'string' && parsedResponse.startsWith('{')) {
      const innerParsed = JSON.parse(parsedResponse);
      return innerParsed.content || 'Tidak ada konten dalam respon';
    } else if (parsedResponse.content) {
      return parsedResponse.content;
    }
    throw new Error('Format respon tidak sesuai');
  } catch (error) {
    throw new Error('Format respon tidak valid');
  }
};

const getAgentId = (type: string): string => {
  switch (type) {
    case 'spkt':
      return 'spkt-analysis-agent';
    case 'image':
      return 'gambar-agent';
    default:
      return 'police-agent';
  }
};