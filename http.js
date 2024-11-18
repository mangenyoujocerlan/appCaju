
import axios from 'axios';


export const fetchData = async () => {
  const url = 'http://appcaju.duckdns.org:7000/seu-endpoint'; 
  try {
    const response = await axios.get(url);  
    return response.data;  
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
  }
};
