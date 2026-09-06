import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { meetsKAnonymity, K_ANONYMITY_MIN } from "@/lib/kanonymity";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#4B5A68", marginBottom: 20 },
  sectionTitle: { fontSize: 13, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EFF3F8", paddingVertical: 6 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#16202B", paddingBottom: 6, fontWeight: 700 },
  cell: { flex: 1 },
  note: { fontSize: 9, color: "#7C8B99", marginTop: 16 }
});

export async function GET() {
  const user = await requireStaff(["ADMIN"]);

  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  const [totalStudents, grantedStudents, pendingStudents, deniedStudents, openAlerts, groups] = await Promise.all([
    prisma.student.count({ where: { schoolId: user.schoolId } }),
    prisma.student.count({ where: { schoolId: user.schoolId, consentStatus: "GRANTED" } }),
    prisma.student.count({ where: { schoolId: user.schoolId, consentStatus: "PENDING" } }),
    prisma.student.count({ where: { schoolId: user.schoolId, consentStatus: "DENIED" } }),
    prisma.safetyAlert.count({ where: { schoolId: user.schoolId, status: { not: "RESOLVED" } } }),
    prisma.group.findMany({
      where: { schoolId: user.schoolId },
      include: { students: { select: { id: true, consentStatus: true } } },
      orderBy: { name: "asc" }
    })
  ]);

  const groupRows = await Promise.all(
    groups.map(async (group) => {
      const activeIds = group.students.filter((s) => s.consentStatus === "GRANTED").map((s) => s.id);
      const hasData = meetsKAnonymity(activeIds.length);
      let sessions: number | null = null;
      if (hasData) {
        const agg = await prisma.usageSummary.aggregate({
          where: { studentId: { in: activeIds } },
          _sum: { sessionsCount: true }
        });
        sessions = agg._sum.sessionsCount ?? 0;
      }
      return { name: group.name, total: group.students.length, active: activeIds.length, hasData, sessions };
    })
  );

  const generatedAt = new Date().toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Informe agregado — {school?.name ?? "Centro"}</Text>
        <Text style={styles.subtitle}>
          Generado el {generatedAt} por {user.name} (administración). Datos agregados y anónimos: no incluye texto de
          conversación del alumnado.
        </Text>

        <Text style={styles.sectionTitle}>Consentimiento familiar</Text>
        <View style={styles.headerRow}>
          <Text style={styles.cell}>Total</Text>
          <Text style={styles.cell}>Concedido</Text>
          <Text style={styles.cell}>Pendiente</Text>
          <Text style={styles.cell}>Denegado</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>{totalStudents}</Text>
          <Text style={styles.cell}>{grantedStudents}</Text>
          <Text style={styles.cell}>{pendingStudents}</Text>
          <Text style={styles.cell}>{deniedStudents}</Text>
        </View>

        <Text style={styles.sectionTitle}>Seguridad</Text>
        <Text>Alertas de seguridad abiertas o en revisión: {openAlerts}</Text>
        <Text style={styles.note}>
          El detalle de cada alerta de seguridad es visible únicamente para la referente de bienestar del centro.
        </Text>

        <Text style={styles.sectionTitle}>Grupos</Text>
        <View style={styles.headerRow}>
          <Text style={styles.cell}>Grupo</Text>
          <Text style={styles.cell}>Alumnado</Text>
          <Text style={styles.cell}>Activos</Text>
          <Text style={styles.cell}>Sesiones (total)</Text>
        </View>
        {groupRows.map((row) => (
          <View style={styles.row} key={row.name}>
            <Text style={styles.cell}>{row.name}</Text>
            <Text style={styles.cell}>{row.total}</Text>
            <Text style={styles.cell}>{row.active}</Text>
            <Text style={styles.cell}>{row.hasData ? row.sessions : "No disponible"}</Text>
          </View>
        ))}
        <Text style={styles.note}>
          Un grupo con menos de {K_ANONYMITY_MIN} alumnos activos con consentimiento no muestra datos agregados, para
          proteger su anonimato.
        </Text>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "EXPORT_REPORT",
    targetType: "School",
    targetId: user.schoolId
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="informe-tara-centros.pdf"`
    }
  });
}
