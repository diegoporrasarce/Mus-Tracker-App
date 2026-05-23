import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, TouchableOpacity, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit'; 

const CHART_COLORS = [
  '#007AFF', // 1. Azul iOS
  '#FF3B30', // 2. Rojo
  '#34C759', // 3. Verde
  '#FF9500', // 4. Naranja
  '#AF52DE', // 5. Morado
  '#FF2D55', // 6. Rosa fuerte
  '#5AC8FA', // 7. Celeste
  '#5856D6', // 8. Índigo
  '#FFCC00', // 9. Amarillo
  '#009688', // 10. Turquesa
  '#8B4513', // 11. Marrón
  '#E91E63', // 12. Magenta
  '#795548', // 13. Café
  '#607D8B', // 14. Gris azulado
  '#4CAF50', // 15. Verde oscuro
  '#9C27B0', // 16. Púrpura
  '#FF5722', // 17. Naranja oscuro
  '#00BCD4', // 18. Cian
  '#FBC02D', // 19. Mostaza
  '#333333'  // 20. Gris oscuro/Casi negro
];

export default function StatsScreen({ route }) {
  const { groupName } = route.params;
  
  // Datos Globales
  const [allPlayers, setAllPlayers] = useState([]);
  const [rawMatches, setRawMatches] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [pairStats, setPairStats] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  
  // Estados de visualización
  const [showPairs, setShowPairs] = useState(false);
  const [columnMode, setColumnMode] = useState('partidas');
  const [sortMode, setSortMode] = useState('normal');

  // Estados para la sección Individual
  const [showIndividual, setShowIndividual] = useState(false);
  const [selectedIndPlayer, setSelectedIndPlayer] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [hiddenPlayers, setHiddenPlayers] = useState([]);
  const [chartMode, setChartMode] = useState('partidas');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await AsyncStorage.getItem(`data-${groupName}`);
    if (!data) return;

    const parsed = JSON.parse(data);
    const players = parsed.players || [];
    const matches = parsed.matches || [];

    setAllPlayers(players);
    setRawMatches(matches);
    setTotalMatches(matches.length);

    const playerData = players.map(player => {
      let wins = 0;
      let losses = 0;
      let gamesWon = 0;

      matches.forEach(match => {
        const isInTeamA = match.teamA.includes(player);
        const isInTeamB = match.teamB.includes(player);

        const isWinner =
          (match.winner === 'A' && isInTeamA) ||
          (match.winner === 'B' && isInTeamB);
        const isLoser =
          (match.winner === 'A' && isInTeamB) ||
          (match.winner === 'B' && isInTeamA);

        if (isWinner) wins++;
        else if (isLoser) losses++;

        if (match.result) {
          const [scoreA, scoreB] = match.result.split('-').map(Number);
          if (isInTeamA && !isNaN(scoreA)) gamesWon += scoreA;
          else if (isInTeamB && !isNaN(scoreB)) gamesWon += scoreB;
        }
      });

      const total = wins + losses;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '—';
      const diff = wins - losses;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

      return { player, winRate, wins, losses, total, gamesWon, diffStr, diff };
    });

    setPlayerStats(playerData);

    const pairMap = {};
    matches.forEach(match => {
      const pairs = [match.teamA, match.teamB];
      pairs.forEach((team, i) => {
        const sortedTeam = [...team].sort();
        const key = sortedTeam.join(' & ');
        if (!pairMap[key]) pairMap[key] = { wins: 0, total: 0 };

        const won = (i === 0 && match.winner === 'A') || (i === 1 && match.winner === 'B');
        if (won) pairMap[key].wins++;
        pairMap[key].total++;
      });
    });

    const pairArray = Object.entries(pairMap).map(([pair, { wins, total }]) => {
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '—';
      return { pair, winRate, total };
    });

    setPairStats(pairArray.sort((a, b) => b.winRate - a.winRate));
  };

  const toggleJugadorSort = () => setSortMode(prev => (prev === 'normal' ? 'dif' : 'normal'));
  const rotateColumnMode = () => setColumnMode(prev => prev === 'partidas' ? 'juegos' : prev === 'juegos' ? 'dif' : 'partidas');

  const sortedPlayerStats = [...playerStats].sort((a, b) => {
    if (sortMode === 'dif') return b.diff - a.diff;
    const rateA = a.winRate === '—' ? -1 : parseFloat(a.winRate);
    const rateB = b.winRate === '—' ? -1 : parseFloat(b.winRate);
    return rateB - rateA;
  });

  const getSelectedPlayerStats = () => {
    if (!selectedIndPlayer) return null;
    let pWon = 0, pLost = 0, gWon = 0, gLost = 0;
    let teammates = {}, opponents = {};

    const playerMatches = rawMatches.filter(m => m.teamA.includes(selectedIndPlayer) || m.teamB.includes(selectedIndPlayer));

    playerMatches.forEach(m => {
      const isA = m.teamA.includes(selectedIndPlayer);
      const won = (m.winner === 'A' && isA) || (m.winner === 'B' && !isA);
      const partner = isA ? m.teamA.find(p => p !== selectedIndPlayer) : m.teamB.find(p => p !== selectedIndPlayer);
      const opps = isA ? m.teamB : m.teamA;

      if (won) {
        pWon++;
        if (partner) teammates[partner] = (teammates[partner] || 0) + 1;
      } else {
        pLost++;
        opps.forEach(o => { opponents[o] = (opponents[o] || 0) + 1; });
      }

      if (m.result) {
        const [scA, scB] = m.result.split('-').map(Number);
        if (isA && !isNaN(scA) && !isNaN(scB)) { gWon += scA; gLost += scB; }
        else if (!isA && !isNaN(scA) && !isNaN(scB)) { gWon += scB; gLost += scA; }
      }
    });

    let bestTeammate = 'Ninguno';
    if (Object.keys(teammates).length > 0) {
      const maxW = Math.max(...Object.values(teammates));
      bestTeammate = Object.keys(teammates).filter(t => teammates[t] === maxW).join(', ') + ` (${maxW}V)`;
    }

    let nemesis = 'Ninguno';
    if (Object.keys(opponents).length > 0) {
      const maxL = Math.max(...Object.values(opponents));
      nemesis = Object.keys(opponents).filter(o => opponents[o] === maxL).join(', ') + ` (${maxL}D)`;
    }

    return { pWon, pLost, gWon, gLost, bestTeammate, nemesis };
  };

  const getChartData = () => {
    const sortedMatches = [...rawMatches].sort((a,b) => new Date(a.date) - new Date(b.date));
    const labels = ['0'];
    sortedMatches.forEach((_, i) => labels.push((i+1).toString()));

    const datasets = [];

    datasets.push({
      data: Array(sortedMatches.length + 1).fill(0),
      color: () => `rgba(0, 0, 0, 0.25)`,
      strokeWidth: 2,
    });

    if (compareMode) {
      allPlayers.forEach((p, idx) => {
        if (hiddenPlayers.includes(p)) return;

        let accum = 0;
        const data = [0];
        sortedMatches.forEach(m => {
          const isA = m.teamA.includes(p);
          const isB = m.teamB.includes(p);
          
          if (isA || isB) {
            if (chartMode === 'juegos') {
              if (m.result) {
                const [scoreA, scoreB] = m.result.split('-').map(Number);
                if (!isNaN(scoreA) && !isNaN(scoreB)) {
                  accum += isA ? scoreA : scoreB;
                }
              }
            } else {
              const won = (m.winner === 'A' && isA) || (m.winner === 'B' && isB);
              if (won) accum++; else accum--;
            }
          }
          data.push(accum);
        });
        if (data.length === 1) data.push(0); 
        datasets.push({
          data,
          color: () => CHART_COLORS[idx % CHART_COLORS.length],
          strokeWidth: p === selectedIndPlayer ? 4 : 2,
        });
      });
    } else {
      let accum = 0;
      const data = [0];
      sortedMatches.forEach(m => {
        const isA = m.teamA.includes(selectedIndPlayer);
        const isB = m.teamB.includes(selectedIndPlayer);
        if (isA || isB) {
          if (chartMode === 'juegos') {
            if (m.result) {
              const [scoreA, scoreB] = m.result.split('-').map(Number);
              if (!isNaN(scoreA) && !isNaN(scoreB)) {
                accum += isA ? scoreA : scoreB;
              }
            }
          } else {
            const won = (m.winner === 'A' && isA) || (m.winner === 'B' && isB);
            if (won) accum++; else accum--;
          }
        }
        data.push(accum);
      });
      if (data.length === 1) data.push(0);
      datasets.push({
        data,
        color: () => `#007AFF`,
        strokeWidth: 3,
      });
    }

    const maxLabelsX = 10;
    const stepX = Math.max(1, Math.ceil(labels.length / maxLabelsX));
    const finalLabels = labels.map((l, i) => (i % stepX === 0 ? l : ''));

    return { labels: finalLabels, datasets };
  };

  const togglePlayerVisibility = (playerName) => {
    setHiddenPlayers(prev => 
      prev.includes(playerName)
        ? prev.filter(p => p !== playerName) 
        : [...prev, playerName] 
    );
  };

  const handleToggleCompareMode = () => {
    setCompareMode(!compareMode);
    setHiddenPlayers([]); 
  };

  const toggleChartMode = () => {
    setChartMode(prev => (prev === 'partidas' ? 'juegos' : 'partidas'));
  };

  const indStats = getSelectedPlayerStats();
  const screenWidth = Dimensions.get("window").width;

  let dynamicSegments = 4; 
  let chartData = null;
  
  if (indStats) {
    chartData = getChartData();
    const allVisiblePoints = chartData.datasets.flatMap(d => d.data);
    const maxPoint = Math.max(...allVisiblePoints, 0);
    const minPoint = Math.min(...allVisiblePoints, 0);
    const range = maxPoint - minPoint;
    
    if (range > 0 && range < 4) {
      dynamicSegments = range; 
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Estadísticas - {groupName}</Text>

      {/* --- TABLA PRINCIPAL --- */}
      <View style={styles.tableHeader}>
        <TouchableOpacity style={styles.cell} onPress={toggleJugadorSort} activeOpacity={0.8}>
          <Text style={styles.bold}>Jugador</Text>
        </TouchableOpacity>
        <Text style={[styles.cell, styles.bold]}>% V</Text>
        <Text style={[styles.cell, styles.bold]}>V / D</Text>
        <TouchableOpacity style={styles.cell} onPress={rotateColumnMode} activeOpacity={0.8}>
          <Text style={styles.bold}>
            {columnMode === 'partidas' ? 'Partidas' : columnMode === 'juegos' ? 'Juegos' : 'Dif'}
          </Text>
        </TouchableOpacity>
      </View>

      {sortedPlayerStats.length > 0 ? (
        sortedPlayerStats.map(item => (
          <View style={styles.tableRow} key={item.player}>
            <Text style={styles.cell}>{item.player}</Text>
            <Text style={styles.cell}>{item.winRate}%</Text>
            <Text style={styles.cell}>{item.wins} / {item.losses}</Text>
            <Text style={styles.cell}>
              {columnMode === 'partidas' ? item.total : columnMode === 'juegos' ? item.gamesWon : item.diffStr}
            </Text>
          </View>
        ))
      ) : (
        <Text style={{ marginTop: 10 }}>Sin estadísticas de jugadores</Text>
      )}

      <Text style={styles.totalText}>Partidas totales jugadas: {totalMatches}</Text>


      {/* --- SECCIÓN PAREJAS --- */}
      <View style={{ marginVertical: 5 }}>
        <Button
          title={showPairs ? 'Ocultar estadísticas parejas' : 'Ver estadísticas parejas'}
          onPress={() => setShowPairs(!showPairs)}
        />
      </View>

      {showPairs && (
        <View style={{ marginTop: 15, marginBottom: 15 }}>
          <Text style={styles.subtitle}>Todas las parejas</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.bold]}>Pareja</Text>
            <Text style={[styles.cell, styles.bold]}>% V</Text>
            <Text style={[styles.cell, styles.bold]}>Partidas</Text>
          </View>
          {pairStats.length > 0 ? (
            pairStats.map(item => (
              <View style={styles.tableRow} key={item.pair}>
                <Text style={styles.cell}>{item.pair}</Text>
                <Text style={styles.cell}>{item.winRate}%</Text>
                <Text style={styles.cell}>{item.total}</Text>
              </View>
            ))
          ) : (
            <Text style={{ marginTop: 10 }}>Aún no hay parejas registradas</Text>
          )}
        </View>
      )}


      {/* --- SECCIÓN INDIVIDUAL --- */}
      <View style={{ marginVertical: 5 }}>
        <Button
          title={showIndividual ? 'Ocultar estadísticas individuales' : 'Ver estadísticas individuales'}
          onPress={() => setShowIndividual(!showIndividual)}
        />
      </View>

      {showIndividual && (
        <View style={styles.indContainer}>
          <Text style={styles.subtitle}>Selecciona un jugador:</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerSelector}>
            {allPlayers.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => {
                  setSelectedIndPlayer(p);
                  setHiddenPlayers([]); 
                }}
                style={[styles.pill, selectedIndPlayer === p && styles.pillSelected]}
              >
                <Text style={[styles.pillText, selectedIndPlayer === p && styles.pillTextSelected]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {indStats && chartData && (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Partidas (V / D)</Text>
                  <Text style={styles.statValue}>{indStats.pWon} - {indStats.pLost}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Juegos (G / P)</Text>
                  <Text style={styles.statValue}>{indStats.gWon} - {indStats.gLost}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Mejor Comp.</Text>
                  <Text style={[styles.statValue, { fontSize: 13 }]}>{indStats.bestTeammate}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Némesis</Text>
                  <Text style={[styles.statValue, { fontSize: 13, color: '#D9534F' }]}>{indStats.nemesis}</Text>
                </View>
              </View>

              {/* Gráfico de Evolución Avanzado */}
              <View style={styles.chartContainer}>
                
                {/* Título dinámico para alternar */}
                <TouchableOpacity onPress={toggleChartMode} activeOpacity={0.7}>
                  <Text style={[styles.chartTitle, { color: '#007AFF' }]}>
                    {chartMode === 'partidas' ? 'Evolución (Dif - Partidas Totales)' : 'Evolución (Juegos Ganados)'}
                  </Text>
                </TouchableOpacity>

                {/* 🧹 Contenedor limpio: Sin textos verticales a la izquierda, ocupa todo el ancho de forma directa */}
                <LineChart
                  data={chartData}
                  width={screenWidth} 
                  height={220}
                  withDots={false}
                  withHorizontalLines={true}
                  withVerticalLines={true}
                  segments={dynamicSegments} 
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    fillShadowGradientFromOpacity: compareMode ? 0 : 0.2,
                    fillShadowGradientToOpacity: 0,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    paddingRight: 40,
                    propsForBackgroundLines: {
                      strokeWidth: 1,
                      stroke: "rgba(0, 0, 0, 0.08)",
                      strokeDasharray: "4, 4", 
                    }
                  }}
                  style={{ marginVertical: 10, marginLeft: -20, borderRadius: 10 }} 
                />

                <Button
                  title={compareMode ? "Ocultar resto de jugadores" : "Comparar con todos"}
                  onPress={handleToggleCompareMode}
                  color={compareMode ? "#888" : "#007AFF"}
                />

                {compareMode && (
                  <View style={styles.legendContainer}>
                    {allPlayers.map((p, idx) => {
                      const isHidden = hiddenPlayers.includes(p);
                      return (
                        <TouchableOpacity 
                          key={p} 
                          style={[styles.legendItem, isHidden && styles.legendItemHidden]}
                          onPress={() => togglePlayerVisibility(p)}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.legendColor, 
                            { backgroundColor: isHidden ? '#d0d0d0' : CHART_COLORS[idx % CHART_COLORS.length] }
                          ]} />
                          
                          <Text style={[
                            styles.legendText, 
                            selectedIndPlayer === p && { fontWeight: 'bold' },
                            isHidden && styles.legendTextHidden
                          ]}>
                            {p}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 10, paddingBottom: 60, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
  totalText: { fontSize: 16, marginTop: 20, marginBottom: 15, fontStyle: 'italic', textAlign: 'center' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, paddingBottom: 5, marginBottom: 10 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#ccc' },
  cell: { flex: 1, fontSize: 14 },
  bold: { fontWeight: 'bold' },

  indContainer: { marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 },
  playerSelector: { flexDirection: 'row', marginBottom: 15, paddingBottom: 5 },
  pill: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#f0f0f0', borderRadius: 20, marginRight: 10 },
  pillSelected: { backgroundColor: '#007AFF' },
  pillText: { fontSize: 14, color: '#333' },
  pillTextSelected: { color: '#fff', fontWeight: 'bold' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  statBox: { width: '48%', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  statLabel: { fontSize: 12, color: '#666', marginBottom: 5, textAlign: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  
  chartContainer: { alignItems: 'center', marginTop: 10, paddingBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 }, 
  
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8, padding: 4 },
  legendItemHidden: { opacity: 0.5 }, 
  legendColor: { width: 12, height: 12, borderRadius: 6, marginRight: 5 },
  legendText: { fontSize: 12, color: '#333' },
  legendTextHidden: { textDecorationLine: 'line-through', color: '#888' } 
});