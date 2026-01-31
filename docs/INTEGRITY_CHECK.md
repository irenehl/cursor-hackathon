# Verificación de integración y coherencia

**Fecha:** 2025-01-31

## ✅ Integrado y coherente

| Componente | Estado | Notas |
|------------|--------|-------|
| Session host fallback | ✅ | Migración 0008, RPC get_session_host, polling cada 3s |
| PvpUi - Desafiar | ✅ | Botón "⚔️ Desafiar" integrado |
| PvpUi - Aceptar/Rechazar | ✅ | Modal de desafío integrado |
| HostOverlay | ✅ | Solo visible cuando isHost, grant/kick/ban |
| Raise Hand | ✅ | raiseHand RPC, hand_granted broadcast |
| leaveSession | ✅ | Se llama en cleanup al salir |
| Eventos públicos | ✅ | join_public_event, capacity, anon |
| createDemoPublicEvent | ✅ | RPC + botón en events page |
| Eventos anon read | ✅ | Política events_select_public_anon |
| RPCs cliente | ✅ | Todos los RPCs tienen wrapper en lib/supabase/rpc.ts |

## ⚠️ Parcialmente integrado (corregido 2025-01-31)

| Componente | Estado | Notas |
|------------|--------|-------|
| PvpUi - KO overlay | ✅ | pvpWinner integrado, muestra "💥 KO! Ganador: X" |
| EventInfoCard | ✅ | Integrado en bottom-left con eventInfo |
| EventStatusBadge | ✅ | Integrado en top-right con eventInfo |
| PlayersOnlineList | ✅ | Integrado con icono host (🧍‍♂️), statusMap vacío por ahora |

## ❌ No implementado

| Funcionalidad | Descripción |
|---------------|-------------|
| deny_hand | Admin rechazar mano levantada |
| Chat por cercanía | Mensajes visibles solo para jugadores cercanos |
| Hand granted full-screen | Mensaje pantalla completa al aceptar mano |
| grant_hand displayName | Broadcast incluye userId pero no displayName para full-screen |

## ⚠️ Migraciones - Posible conflicto

Hay migraciones con números duplicados (Supabase aplica por orden alfabético):

- `0006_event_visibility.sql` vs `0006_public_event_capacity_anon.sql`
- `0007_events_anon_public_read.sql` vs `0007_test_event_and_anon_policy.sql`
- `0008_fix_rls_recursion.sql` vs `0008_session_host_fallback.sql`

**Recomendación:** Renombrar a secuencia única (0009, 0010, etc.) para evitar conflictos.

## Estructura de datos requerida para integración completa

Para EventInfoCard / EventStatusBadge la session page necesita:
- `event.title`, `event.capacity`, `event.starts_at`, `event.duration_minutes`
- Cálculo de estado: EN VIVO / PRÓXIMAMENTE / FINALIZADO según starts_at y duration
- Cálculo de countdown si aplica
- usersCount = playersOnline.length (presence)
