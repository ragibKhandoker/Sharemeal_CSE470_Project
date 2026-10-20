import { API_BASE_URL } from '../utils/constants';

export const receiverAssistantService = {
  ask: async (messages, onChunk, { signal, page, onStatus } = {}) => {
    const token = sessionStorage.getItem('sharemeal_token') || localStorage.getItem('sharemeal_token');
    const response = await fetch(`${API_BASE_URL}/help-assistant/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ messages, page }),
      signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'The AI assistant could not answer right now.');
    }
    if (!response.body) {
      throw new Error('Your browser does not support streaming AI responses.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    let truncated = false;

    const processEvent = (eventText) => {
      const data = eventText
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (!data) return;

      let event;
      try {
        event = JSON.parse(data);
      } catch {
        return;
      }
      if (event.error) throw new Error(event.error);
      if (event.truncated) truncated = true;
      if (event.status) onStatus?.(event.status);
      if (event.text) {
        answer += event.text;
        onChunk(event.text, answer);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      events.forEach(processEvent);
    }
    buffer += decoder.decode();
    if (buffer.trim()) processEvent(buffer);

    if (!answer.trim()) {
      throw new Error('The AI assistant did not return an answer. Please try again.');
    }
    return { answer, truncated };
  }
};

export default receiverAssistantService;
