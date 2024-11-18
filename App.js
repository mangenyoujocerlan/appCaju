import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchData } from './http'; // função de requisição

const App = () => {
  const [dados, setDados] = useState({});
  const [horaAtual, setHoraAtual] = useState('');
  const [historico, setHistorico] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  // Função para salvar dados no AsyncStorage (adicionando ao histórico)
  const saveData = async (dados) => {
    try {
      const savedData = await AsyncStorage.getItem('historico');
      const historicoAtual = savedData ? JSON.parse(savedData) : [];

      const dataComHora = { ...dados, hora: new Date().toISOString() };
      historicoAtual.push(dataComHora);

      await AsyncStorage.setItem('historico', JSON.stringify(historicoAtual));
      setHistorico(historicoAtual); 
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  };

  // Função para carregar dados do AsyncStorage (histórico)
  const loadHistorico = async () => {
    try {
      const savedData = await AsyncStorage.getItem('historico');
      if (savedData) {
        setHistorico(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  // Função para calcular a média da umidade e nível da água do dia
  const calcularMedia = (campo) => {
    const hoje = new Date().toLocaleDateString(); 
    const dadosFiltrados = historico.filter(item => new Date(item.hora).toLocaleDateString() === hoje);
    
    const soma = dadosFiltrados.reduce((total, item) => total + item[campo], 0);
    const media = dadosFiltrados.length > 0 ? soma / dadosFiltrados.length : 0;
    
    return media;
  };

  // Função para classificar o nível de umidade ou nível de água
  const classificarNivel = (campo, media) => {
    if (campo === 'umidade_solo') {
      if (media > 75) return 'Ótimo';
      if (media > 50) return 'Normal';
      return 'Seco';
    }
    if (campo === 'nivel_caixa') {
      if (media > 75) return 'Bom';
      if (media > 50) return 'Médio';
      return 'Baixo';
    }
  };

  // Função para definir a cor de fundo do alerta baseado no nível
  const definirCorAlerta = (campo, media) => {
    if (campo === 'umidade_solo') {
      if (media > 75) return '#81C784'; // Verde claro para ótimo
      if (media > 50) return '#FFEB3B'; // Amarelo para normal
      return '#E57373'; // Vermelho para seco
    }
    if (campo === 'nivel_caixa') {
      if (media > 75) return '#81C784'; // Verde claro para bom
      if (media > 50) return '#FFEB3B'; // Amarelo para médio
      return '#E57373'; // Vermelho para baixo
    }
  };

  const dadosPaginated = historico.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Função para buscar dados da API e atualizar o estado
  const fetchSensorData = async () => {
    const data = await fetchData();
    setDados(data);
    saveData(data); 
  };

  // Atualiza a hora atual a cada minuto
  useEffect(() => {
    const intervalId = setInterval(() => {
      setHoraAtual(new Date().toLocaleString());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Atualiza os dados a cada 10 segundos
  useEffect(() => {
    const fetchInterval = setInterval(() => {
      fetchSensorData();
    }, 10000);

    return () => clearInterval(fetchInterval);
  }, []);

  const mediaUmidade = calcularMedia('umidade_solo');
  const mediaNivelAgua = calcularMedia('nivel_caixa');

  // Função para zerar o histórico
  const resetHistorico = async () => {
    try {
      // Remove o histórico do AsyncStorage
      await AsyncStorage.removeItem('historico');
      // Atualiza o estado local do histórico para refletir a remoção
      setHistorico([]);
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Nome no topo */}
      <Text style={styles.header}>Monitoramento AppCaju</Text>

      {/* Alerta de Umidade e Nível de Água */}
      <View style={[styles.alertContainer, { backgroundColor: definirCorAlerta('umidade_solo', mediaUmidade) }]}>
        <Text style={[styles.alertText, styles.alertTextShadow]}>
          Alerta de Umidade: {classificarNivel('umidade_solo', mediaUmidade)}
        </Text>
      </View>

      <View style={[styles.alertContainer, { backgroundColor: definirCorAlerta('nivel_caixa', mediaNivelAgua) }]}>
        <Text style={[styles.alertText, styles.alertTextShadow]}>
          Alerta de Nível de Água: {classificarNivel('nivel_caixa', mediaNivelAgua)}
        </Text>
      </View>

      {/* Botão de Resetar Histórico */}
      <View style={styles.resetButtonContainer}>
        <Button title="Resetar Dados" color="#E57373" onPress={resetHistorico} />
      </View>
      
      {/* Histórico de Dados */}
      <Text style={styles.historyHeader}>Histórico de Dados:</Text>
      <ScrollView style={styles.scrollView}>
        {dadosPaginated.map((item, index) => (
          <View key={index} style={styles.historyItem}>
            <Text style={styles.historyItemText}>Nível da Caixa d'Água: {item.nivel_caixa}</Text>
            <Text style={styles.historyItemText}>Umidade do Solo: {item.umidade_solo}%</Text>
            <Text style={styles.historyItemText}>Estado da Bomba: {item.estado_bomba}</Text>
            <Text style={styles.historyItemText}>Hora da Leitura: {new Date(item.hora).toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        <Button
          title="Anterior"
          color="#4CAF50" // Tom de verde para o botão
          onPress={() => setPaginaAtual(paginaAtual > 1 ? paginaAtual - 1 : 1)}
        />
        <Text> Página {paginaAtual} </Text>
        <Button
          title="Próximo"
          color="#4CAF50" // Tom de verde para o botão
          onPress={() => setPaginaAtual(paginaAtual + 1)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#424242', // Cor de fundo cinza escuro
  },
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
    color: '#388E3C', // Cor verde para o cabeçalho
  },
  scrollView: {
    marginTop: 20,
    width: '90%',
  },
  resetButtonContainer: {
    marginTop: 10,
    width: '80%',
  },
  historyHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#FFFFFF', // Cor branca para o texto
  },
  historyItem: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#81C784', // Tom de verde para borda
    borderRadius: 5,
    backgroundColor: '#616161', // Tom de cinza mais claro para os itens de histórico
  },
  historyItemText: {
    color: '#FFFFFF', // Texto branco dentro do histórico
  },
  alertContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  alertText: {
    fontSize: 16,
    color: 'white',
  },
  alertTextShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
});

export default App;
