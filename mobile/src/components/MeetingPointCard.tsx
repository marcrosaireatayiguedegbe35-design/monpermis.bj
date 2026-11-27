import { MapPin, Navigation } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { dark, fonts } from '../theme'
import { safeOpenUrl } from '../utils/safeOpenUrl'

/**
 * Lieu de séance renseigné par le moniteur : sa description et un bouton qui ouvre Google Maps.
 * N'affiche rien si le moniteur n'a rien renseigné.
 */
export function MeetingPointCard({ url, note }: { url?: string | null; note?: string | null }) {
  const link = String(url || '').trim()
  const text = String(note || '').trim()
  if (!link && !text) return null

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <MapPin size={20} color={dark.green} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Lieu de la séance</Text>
        {text ? (
          <Text style={styles.note} numberOfLines={3}>
            {text}
          </Text>
        ) : null}
        {link ? (
          <Pressable
            style={styles.button}
            onPress={() => void safeOpenUrl(link)}
            accessibilityRole="link"
            accessibilityLabel="Ouvrir le lieu de la séance dans Google Maps"
          >
            <Navigation size={15} color="#FFFFFF" />
            <Text style={styles.buttonText}>Ouvrir dans Google Maps</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#EAF6EF',
    borderWidth: 1,
    borderColor: 'rgba(11,127,71,0.18)',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#0A1E55' },
  note: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: '#33405E' },
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#0B7F47',
  },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
})
