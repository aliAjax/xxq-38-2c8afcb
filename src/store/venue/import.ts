import type { VenueData, ImportPreviewResult, ImportStrategy, SeatConflictInfo, ZoneConflictInfo, InvalidSeatInfo, Seat, ActivityLogEntry } from '@/types'
import type { VenueStore, VenueSet, VenueGet } from './storeTypes'
import { cloneSeats, getDefaultZoneLayout } from './utils'
import { pushHistory } from './history'
import { createActivityLogEntry } from './activityLog'

export function previewImportData(
  json: string,
  strategy: ImportStrategy,
  currentZones: VenueStore['zones'],
  currentSeats: VenueStore['seats']
): ImportPreviewResult {
  const formatErrors: string[] = []
  let parsedData: VenueData | null = null

  try {
    parsedData = JSON.parse(json) as VenueData
  } catch (e) {
    formatErrors.push('JSON 格式解析失败：' + (e instanceof Error ? e.message : '未知错误'))
    return {
      isValid: false,
      formatErrors,
      newZones: [],
      overwriteZones: [],
      mergeZones: [],
      invalidSeats: [],
      duplicateMembers: [],
      totalNew: 0,
      totalOverwrite: 0,
      totalMerge: 0,
      totalInvalid: 0,
      parsedData: null,
    }
  }

  if (!parsedData.zones || !Array.isArray(parsedData.zones)) {
    formatErrors.push('数据格式错误：缺少 zones 字段或格式不正确')
  }
  if (!parsedData.seats || typeof parsedData.seats !== 'object') {
    formatErrors.push('数据格式错误：缺少 seats 字段或格式不正确')
  }

  if (formatErrors.length > 0) {
    return {
      isValid: false,
      formatErrors,
      newZones: [],
      overwriteZones: [],
      mergeZones: [],
      invalidSeats: [],
      duplicateMembers: [],
      totalNew: 0,
      totalOverwrite: 0,
      totalMerge: 0,
      totalInvalid: 0,
      parsedData: null,
    }
  }

  const currentZoneNameMap = new Map(currentZones.map((z) => [z.name.trim().toLowerCase(), z]))
  const newZones: ZoneConflictInfo[] = []
  const overwriteZones: ZoneConflictInfo[] = []
  const mergeZones: ZoneConflictInfo[] = []
  const invalidSeats: InvalidSeatInfo[] = []
  const allMembers = new Set<string>()
  const duplicateMembers = new Set<string>()

  for (const zone of parsedData.zones) {
    if (!zone.id || !zone.name || zone.rows <= 0 || zone.cols <= 0) {
      formatErrors.push(`区域数据无效：${JSON.stringify(zone)}`)
      continue
    }

    const zoneKey = zone.name.trim().toLowerCase()
    const existingZone = currentZoneNameMap.get(zoneKey)
    const zoneSeats = parsedData.seats[zone.id] || []

    let assignedCount = 0
    const conflictSeats: SeatConflictInfo[] = []

    for (const seat of zoneSeats) {
      if (seat.memberName) {
        assignedCount++
        const memberKey = seat.memberName.trim()
        if (memberKey) {
          if (allMembers.has(memberKey)) {
            duplicateMembers.add(memberKey)
          }
          allMembers.add(memberKey)
        }
      }

      if (existingZone) {
        const existingSeats = currentSeats[existingZone.id] || []
        const existingSeat = existingSeats.find((s) => s.seatNumber === seat.seatNumber)

        if (!existingSeat) {
          invalidSeats.push({
            zoneName: zone.name,
            seatNumber: seat.seatNumber,
            reason: '座位号不存在于当前区域',
          })
          continue
        }

        if (existingSeat.memberName && seat.memberName && existingSeat.memberName !== seat.memberName) {
          const effectiveStrategy: 'overwrite' | 'mergeEmpty' = strategy === 'mergeEmpty' ? 'mergeEmpty' : 'overwrite'
          conflictSeats.push({
            seatId: existingSeat.id,
            seatNumber: seat.seatNumber,
            existingMember: existingSeat.memberName,
            newMember: seat.memberName,
            willBeOverwritten: effectiveStrategy === 'overwrite',
            choice: effectiveStrategy === 'overwrite' ? 'overwrite' : 'skip',
            existingTicketStatus: existingSeat.ticketStatus,
            newTicketStatus: seat.ticketStatus,
            existingCheeringColor: existingSeat.cheeringColor,
            newCheeringColor: seat.cheeringColor,
            existingSupplies: existingSeat.supplies,
            newSupplies: seat.supplies,
          })
        }
      }
    }

    const hasConflicts = conflictSeats.length > 0
    const zoneInfo: ZoneConflictInfo = {
      zone,
      status: existingZone ? (hasConflicts ? 'overwrite' : 'merge') : 'new',
      totalSeats: zoneSeats.length,
      assignedSeats: assignedCount,
      conflictSeats,
      selected: true,
    }

    if (!existingZone) {
      newZones.push(zoneInfo)
    } else if (hasConflicts) {
      overwriteZones.push(zoneInfo)
    } else {
      mergeZones.push(zoneInfo)
    }
  }

  for (const [zoneId, seats] of Object.entries(parsedData.seats)) {
    const zone = parsedData.zones.find((z) => z.id === zoneId)
    if (!zone) {
      for (const seat of seats) {
        invalidSeats.push({
          zoneName: `未知区域(${zoneId})`,
          seatNumber: seat.seatNumber,
          reason: '所属区域不存在',
        })
      }
    }
  }

  const totalNew = newZones.reduce((sum, z) => sum + z.assignedSeats, 0)
  const totalOverwrite = overwriteZones.reduce((sum, z) => sum + z.conflictSeats.length, 0)
  const totalMerge = mergeZones.reduce((sum, z) => sum + z.assignedSeats - z.conflictSeats.length, 0)
  const totalInvalid = invalidSeats.length

  return {
    isValid: formatErrors.length === 0,
    formatErrors,
    newZones,
    overwriteZones,
    mergeZones,
    invalidSeats,
    duplicateMembers: Array.from(duplicateMembers),
    totalNew,
    totalOverwrite,
    totalMerge,
    totalInvalid,
    parsedData,
  }
}

export function createImportSlice(set: VenueSet, get: VenueGet): Pick<
  VenueStore,
  | 'exportData'
  | 'importData'
  | 'previewImportData'
  | 'executeConfirmedImport'
  | 'batchImportMembers'
  | 'clearAll'
> {
  return {
    exportData: () => {
      const { zones, seats } = get()
      return JSON.stringify({ zones, seats }, null, 2)
    },

    importData: (json, recordHistory = true) => {
      try {
        const data = JSON.parse(json) as VenueData
        if (!data.zones || !data.seats) return false
        const zonesWithLayout = data.zones.map((zone, index) => {
          const hasLayout = zone.x !== undefined && zone.y !== undefined && zone.width !== undefined && zone.height !== undefined
          if (hasLayout) return zone
          return {
            ...zone,
            ...getDefaultZoneLayout(index, zone.cols, zone.rows),
          }
        })

        if (recordHistory) {
          pushHistory(set, get(), {
            type: 'importData',
            label: '导入数据',
          })
        }

        const migratedSeats: Record<string, Seat[]> = {}
        for (const [zoneId, zoneSeats] of Object.entries(data.seats)) {
          migratedSeats[zoneId] = zoneSeats.map((seat) => ({
            ...seat,
            activityLog: seat.activityLog || [],
          }))
        }
        set({ zones: zonesWithLayout, seats: migratedSeats })
        return true
      } catch {
        return false
      }
    },

    previewImportData: (json, strategy) => {
      const { zones, seats } = get()
      return previewImportData(json, strategy, zones, seats)
    },

    executeConfirmedImport: (preview, strategy, selectedZoneIds, seatConflictChoices, recordHistory = true) => {
      if (!preview.parsedData) {
        return { success: false, message: '没有有效的解析数据' }
      }

      if (!preview.isValid) {
        return { success: false, message: '数据格式有错误，无法导入' }
      }

      const currentState = get()
      const backupSeats = cloneSeats(currentState.seats)
      const backupZones = currentState.zones.map((z) => ({ ...z }))

      try {
        const { zones: parsedZones, seats: parsedSeats } = preview.parsedData
        const selectedZoneIdSet = new Set(selectedZoneIds)

        const currentZoneNameMap = new Map(currentState.zones.map((z) => [z.name.trim().toLowerCase(), z]))
        const updatedZones = currentState.zones.map((z) => ({ ...z }))
        const updatedSeats = cloneSeats(currentState.seats)

        const effectiveStrategy: 'overwrite' | 'mergeEmpty' = strategy === 'mergeEmpty' ? 'mergeEmpty' : 'overwrite'
        const author = '我'

        for (const zone of parsedZones) {
          if (!selectedZoneIdSet.has(zone.id)) continue

          const zoneKey = zone.name.trim().toLowerCase()
          const existingZone = currentZoneNameMap.get(zoneKey)
          const zoneSeats = parsedSeats[zone.id] || []

          if (!existingZone) {
            const layout = {
              x: zone.x ?? 50 + (updatedZones.length % 4) * 180,
              y: zone.y ?? 50 + Math.floor(updatedZones.length / 4) * 120,
              width: zone.width ?? Math.max(120, zone.cols * 30),
              height: zone.height ?? Math.max(80, zone.rows * 25),
            }
            const newZone = { ...zone, ...layout }
            updatedZones.push(newZone)
            updatedSeats[zone.id] = zoneSeats.map((s) => ({
              ...s,
              activityLog: s.activityLog || [],
            }))
          } else {
            const targetSeats = updatedSeats[existingZone.id]
            if (!targetSeats) continue

            const seatNumberMap = new Map(targetSeats.map((s) => [s.seatNumber, s]))

            for (const newSeat of zoneSeats) {
              const existingSeat = seatNumberMap.get(newSeat.seatNumber)
              if (!existingSeat) continue

              const activityLogs: ActivityLogEntry[] = []
              let shouldUpdate = false

              const hasConflict = existingSeat.memberName && newSeat.memberName && existingSeat.memberName !== newSeat.memberName
              const conflictChoice = seatConflictChoices?.[existingSeat.id]

              let seatAction: 'overwrite' | 'keep' | 'skip' | 'mergeEmpty'
              if (hasConflict && conflictChoice) {
                seatAction = conflictChoice
              } else if (hasConflict) {
                seatAction = effectiveStrategy === 'overwrite' ? 'overwrite' : 'skip'
              } else {
                seatAction = effectiveStrategy === 'overwrite' ? 'overwrite' : 'mergeEmpty'
              }

              if (seatAction === 'overwrite') {
                if (existingSeat.memberName !== newSeat.memberName && newSeat.memberName) {
                  activityLogs.push(createActivityLogEntry('assignMember', author, {
                    oldValue: existingSeat.memberName || undefined,
                    newValue: newSeat.memberName,
                    fieldName: 'memberName',
                    note: hasConflict ? '通过导入覆盖（冲突处理）' : '通过导入覆盖',
                  }))
                }
                if (existingSeat.ticketStatus !== newSeat.ticketStatus) {
                  activityLogs.push(createActivityLogEntry('changeTicketStatus', author, {
                    oldValue: existingSeat.ticketStatus,
                    newValue: newSeat.ticketStatus,
                    fieldName: 'ticketStatus',
                    note: hasConflict ? '通过导入覆盖（冲突处理）' : '通过导入覆盖',
                  }))
                }
                if (existingSeat.cheeringColor !== newSeat.cheeringColor) {
                  activityLogs.push(createActivityLogEntry('updateCheeringColor', author, {
                    oldValue: existingSeat.cheeringColor || undefined,
                    newValue: newSeat.cheeringColor || undefined,
                    fieldName: 'cheeringColor',
                    note: hasConflict ? '通过导入覆盖（冲突处理）' : '通过导入覆盖',
                  }))
                }
                if (existingSeat.supplies !== newSeat.supplies) {
                  activityLogs.push(createActivityLogEntry('updateSupplies', author, {
                    oldValue: existingSeat.supplies || undefined,
                    newValue: newSeat.supplies || undefined,
                    fieldName: 'supplies',
                    note: hasConflict ? '通过导入覆盖（冲突处理）' : '通过导入覆盖',
                  }))
                }
                existingSeat.memberName = newSeat.memberName
                existingSeat.cheeringColor = newSeat.cheeringColor
                existingSeat.ticketStatus = newSeat.ticketStatus
                existingSeat.supplies = newSeat.supplies
                shouldUpdate = true
              } else if (seatAction === 'mergeEmpty') {
                if (!existingSeat.memberName && newSeat.memberName) {
                  activityLogs.push(createActivityLogEntry('assignMember', author, {
                    oldValue: undefined,
                    newValue: newSeat.memberName,
                    fieldName: 'memberName',
                    note: '通过导入合并',
                  }))
                  existingSeat.memberName = newSeat.memberName
                  existingSeat.cheeringColor = newSeat.cheeringColor
                  existingSeat.ticketStatus = newSeat.ticketStatus
                  existingSeat.supplies = newSeat.supplies
                  shouldUpdate = true
                }
              }

              if (shouldUpdate) {
                const currentActivityLog = existingSeat.activityLog || []
                existingSeat.activityLog = [...currentActivityLog, ...activityLogs]
              }
            }
          }
        }

        const updatePayload: Partial<VenueStore> = {
          zones: updatedZones,
          seats: updatedSeats,
        }

        if (recordHistory) {
          updatePayload.past = [...currentState.past, {
            type: 'importData' as const,
            before: backupSeats,
            beforeZones: backupZones,
            label: '导入数据'
          }]
          updatePayload.future = []
          updatePayload.canUndo = true
          updatePayload.canRedo = false
        }

        set(updatePayload)

        const importedZones = selectedZoneIds.length
        const importedSeats = [...preview.newZones, ...preview.overwriteZones, ...preview.mergeZones]
          .filter((z) => selectedZoneIdSet.has(z.zone.id))
          .reduce((sum, z) => sum + z.assignedSeats, 0)

        return {
          success: true,
          message: `成功导入 ${importedZones} 个区域，${importedSeats} 条座位数据`
        }
      } catch (e) {
        set({ zones: backupZones, seats: backupSeats })
        return {
          success: false,
          message: '导入失败：' + (e instanceof Error ? e.message : '未知错误')
        }
      }
    },

    batchImportMembers: (items, recordHistory = true) => {
      const { zones, seats } = get()
      const zoneNameMap = new Map(zones.map((z) => [z.name.trim().toLowerCase(), z]))
      const unmatchedZones = new Set<string>()
      const unmatchedSeats: string[] = []
      const duplicateMembers: string[] = []
      const seenMembers = new Set<string>()
      const updatesMap = new Map<string, Map<string, Partial<Seat>>>()

      for (const item of items) {
        const memberKey = item.memberName.trim()
        if (memberKey && seenMembers.has(memberKey)) {
          if (!duplicateMembers.includes(memberKey)) {
            duplicateMembers.push(memberKey)
          }
        }
        if (memberKey) seenMembers.add(memberKey)

        const zoneKey = item.zoneName.trim().toLowerCase()
        const zone = zoneNameMap.get(zoneKey)
        if (!zone) {
          unmatchedZones.add(item.zoneName)
          continue
        }

        const zoneSeats = seats[zone.id] || []
        const seat = zoneSeats.find((s) => s.seatNumber === item.seatNumber.trim())
        if (!seat) {
          unmatchedSeats.push(`${item.zoneName} ${item.seatNumber}`)
          continue
        }

        if (!updatesMap.has(zone.id)) {
          updatesMap.set(zone.id, new Map())
        }
        updatesMap.get(zone.id)!.set(seat.id, {
          memberName: item.memberName.trim(),
          cheeringColor: item.cheeringColor.trim(),
          ticketStatus: item.ticketStatus,
          supplies: item.supplies.trim(),
        })
      }

      const matchedCount = Array.from(updatesMap.values()).reduce((sum, m) => sum + m.size, 0)

      if (recordHistory && matchedCount > 0) {
        const before: Record<string, Seat[]> = {}
        for (const [zoneId, seatUpdates] of updatesMap) {
          const zoneSeats = seats[zoneId] || []
          before[zoneId] = zoneSeats
            .filter((s) => seatUpdates.has(s.id))
            .map((s) => ({ ...s }))
        }
        pushHistory(set, get(), {
          type: 'batchImportMembers',
          before,
          label: '导入成员名单',
        })
      }

      set((state) => {
        const newSeats = { ...state.seats }
        const author = '我'
        for (const [zoneId, seatUpdates] of updatesMap) {
          const zoneSeats = newSeats[zoneId] || []
          newSeats[zoneId] = zoneSeats.map((s) => {
            const updates = seatUpdates.get(s.id)
            if (!updates) return s

            const activityLogs: ActivityLogEntry[] = []

            if (updates.memberName && s.memberName !== updates.memberName) {
              activityLogs.push(createActivityLogEntry('assignMember', author, {
                oldValue: s.memberName || undefined,
                newValue: updates.memberName,
                fieldName: 'memberName',
                note: '通过导入分配',
              }))
            }

            if (updates.ticketStatus && s.ticketStatus !== updates.ticketStatus) {
              activityLogs.push(createActivityLogEntry('changeTicketStatus', author, {
                oldValue: s.ticketStatus,
                newValue: updates.ticketStatus,
                fieldName: 'ticketStatus',
                note: '通过导入更新',
              }))
            }

            if (updates.cheeringColor && s.cheeringColor !== updates.cheeringColor) {
              activityLogs.push(createActivityLogEntry('updateCheeringColor', author, {
                oldValue: s.cheeringColor || undefined,
                newValue: updates.cheeringColor || undefined,
                fieldName: 'cheeringColor',
                note: '通过导入更新',
              }))
            }

            if (updates.supplies && s.supplies !== updates.supplies) {
              activityLogs.push(createActivityLogEntry('updateSupplies', author, {
                oldValue: s.supplies || undefined,
                newValue: updates.supplies || undefined,
                fieldName: 'supplies',
                note: '通过导入更新',
              }))
            }

            const currentActivityLog = s.activityLog || []
            const newActivityLog = [...currentActivityLog, ...activityLogs]

            return { ...s, ...updates, activityLog: newActivityLog }
          })
        }
        return { seats: newSeats }
      })

      return {
        matched: matchedCount,
        unmatchedZones: Array.from(unmatchedZones),
        unmatchedSeats,
        duplicateMembers,
      }
    },

    clearAll: (recordHistory = true) => {
      if (recordHistory) {
        pushHistory(set, get(), {
          type: 'clearAll',
          label: '清空全部数据',
        })
      }
      set({ zones: [], seats: {} })
    },
  }
}
