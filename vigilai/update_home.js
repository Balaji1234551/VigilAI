const fs = require('fs');

let content = fs.readFileSync('src/screens/HomeScreen.js', 'utf8');

const target = `export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning, Alex</Text>
            <Text style={styles.date}>Wednesday, April 22</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarText}>A</Text>
          </TouchableOpacity>
        </View>`;

const replacement = `export default function HomeScreen({ navigation }) {
  const [userName, setUserName] = useState('User');
  const [greeting, setGreeting] = useState('Good morning');
  const [dateTimeStr, setDateTimeStr] = useState('');

  useEffect(() => {
    // 1. Fetch User Name
    const fetchUser = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.displayName) {
            setUserName(userData.displayName.split(' ')[0]);
          } else if (userData.email) {
            setUserName(userData.email.split('@')[0]);
          }
        }
      } catch (e) {
        console.error('Failed to load user', e);
      }
    };
    fetchUser();

    // 2. Update Time and Greeting
    const updateTime = () => {
      const now = new Date();
      
      const hour = now.getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 17) setGreeting('Good afternoon');
      else if (hour < 20) setGreeting('Good evening');
      else setGreeting('Good night');

      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      const dateStr = now.toLocaleDateString('en-US', options);
      
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      const minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
      const timeStr = \`\${hours}:\${minutes} \${ampm}\`;

      setDateTimeStr(\`\${dateStr} • \${timeStr}\`);
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {userName}</Text>
            <Text style={styles.date}>{dateTimeStr}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>`;

// handle CRLF
const targetRegex = new RegExp(target.replace(/[.*+?^$\{key}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n'));
content = content.replace(targetRegex, replacement);

fs.writeFileSync('src/screens/HomeScreen.js', content, 'utf8');
console.log('Done');
