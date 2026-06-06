import type { Seat, ActivityLogEntry, ActivityLogType } from '@/types'
import { generateId } from './utils'

export function createActivityLogEntry(
  type: ActivityLogType,
  author: string,
  data: Partial<ActivityLogEntry> = {}
): ActivityLogEntry {
  return {
    id: generateId(),
    timestamp: Date.now(),
    type,
    author,
    ...data,
  }
}

type SeatUpdates = Partial<Omit<Seat, 'id' | 'zoneId' | 'row' | 'col' | 'seatNumber' | 'activityLog'>>

export function generateActivityLogs(seat: Seat, updates: SeatUpdates, author: string): ActivityLogEntry[] {
  const logs: ActivityLogEntry[] = []

  if ('memberName' in updates && seat.memberName !== updates.memberName) {
    if (updates.memberName) {
      logs.push(createActivityLogEntry('assignMember', author, {
        oldValue: seat.memberName || undefined,
        newValue: updates.memberName,
        fieldName: 'memberName',
      }))
    }
  }

  if ('ticketStatus' in updates && seat.ticketStatus !== updates.ticketStatus) {
    logs.push(createActivityLogEntry('changeTicketStatus', author, {
      oldValue: seat.ticketStatus,
      newValue: updates.ticketStatus,
      fieldName: 'ticketStatus',
    }))
  }

  if ('isObstructed' in updates && seat.isObstructed !== updates.isObstructed) {
    logs.push(createActivityLogEntry('toggleObstruction', author, {
      oldValue: seat.isObstructed,
      newValue: updates.isObstructed,
      fieldName: 'isObstructed',
      note: updates.isObstructed ? (updates.obstructionNote || seat.obstructionNote) : undefined,
    }))
  }

  if ('obstructionNote' in updates && seat.obstructionNote !== updates.obstructionNote && seat.isObstructed) {
    logs.push(createActivityLogEntry('toggleObstruction', author, {
      oldValue: seat.obstructionNote || undefined,
      newValue: updates.obstructionNote || undefined,
      fieldName: 'obstructionNote',
    }))
  }

  if ('cheeringColor' in updates && seat.cheeringColor !== updates.cheeringColor) {
    logs.push(createActivityLogEntry('updateCheeringColor', author, {
      oldValue: seat.cheeringColor || undefined,
      newValue: updates.cheeringColor || undefined,
      fieldName: 'cheeringColor',
    }))
  }

  if ('supplies' in updates && seat.supplies !== updates.supplies) {
    logs.push(createActivityLogEntry('updateSupplies', author, {
      oldValue: seat.supplies || undefined,
      newValue: updates.supplies || undefined,
      fieldName: 'supplies',
    }))
  }

  const isClear = Object.keys(updates).length >= 5
  if (isClear) {
    logs.push(createActivityLogEntry('clearSeat', author, {
      note: '清空座位信息',
    }))
  }

  return logs
}

export function applyActivityLogs(seat: Seat, logs: ActivityLogEntry[]): Seat {
  const currentActivityLog = seat.activityLog || []
  return {
    ...seat,
    activityLog: [...currentActivityLog, ...logs],
  }
}

export function generateBatchUpdateLabel(updates: SeatUpdates): string {
  if ('cheeringColor' in updates) return '批量上色'
  if ('ticketStatus' in updates) return '批量换票状态'
  if ('isObstructed' in updates) return '批量遮挡标记'
  if (Object.keys(updates).length >= 5) return '清空座位'
  return '批量更新'
}
