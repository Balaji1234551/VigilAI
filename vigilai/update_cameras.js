const fs = require('fs');

let content = fs.readFileSync('src/screens/CameraScreen.js', 'utf8');

const listTarget = `        {/* Camera List */}
        <View style={styles.listContainer}>
          <CameraCard title="Main Entrance" subtitle="Front Door" status="Online" isOnline={true} />
          <CameraCard title="Living Room" subtitle="First Floor" status="Online" isOnline={true} />
          <CameraCard title="Backyard" subtitle="Outdoor" status="Offline" isOnline={false} />
        </View>`;

const listReplacement = `        {/* Camera List */}
        <View style={styles.listContainer}>
          <CameraCard title="Main Entrance" subtitle="Front Door" status="Online" isOnline={true} onPress={() => navigation.navigate('CameraDetails', { cameraName: 'Main Entrance' })} />
          <CameraCard title="Living Room" subtitle="First Floor" status="Online" isOnline={true} onPress={() => navigation.navigate('CameraDetails', { cameraName: 'Living Room' })} />
          <CameraCard title="Backyard" subtitle="Outdoor" status="Offline" isOnline={false} onPress={() => navigation.navigate('CameraDetails', { cameraName: 'Backyard' })} />
        </View>`;

const cardTarget = `const CameraCard = ({ title, subtitle, status, isOnline }) => (
  <View style={styles.card}>
    <View style={styles.thumbnailPlaceholder}>
      <Camera size={32} color="#242C3E" />
    </View>
    <View style={styles.cardInfo}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <TouchableOpacity><MoreVertical size={20} color="#94A3B8" /></TouchableOpacity>
      </View>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#00C853' : '#FF5252' }]} />
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  </View>
);`;

const cardReplacement = `const CameraCard = ({ title, subtitle, status, isOnline, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.thumbnailPlaceholder}>
      <Camera size={32} color="#242C3E" />
    </View>
    <View style={styles.cardInfo}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <TouchableOpacity><MoreVertical size={20} color="#94A3B8" /></TouchableOpacity>
      </View>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#00C853' : '#FF5252' }]} />
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  </TouchableOpacity>
);`;

const targetRegexList = new RegExp(listTarget.replace(/[.*+?^$\{key}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n'));
content = content.replace(targetRegexList, listReplacement);

const targetRegexCard = new RegExp(cardTarget.replace(/[.*+?^$\{key}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n'));
content = content.replace(targetRegexCard, cardReplacement);

fs.writeFileSync('src/screens/CameraScreen.js', content, 'utf8');
console.log('Done Update');
