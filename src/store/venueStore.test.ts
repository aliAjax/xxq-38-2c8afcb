import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useVenueStore } from './venueStore'
import type { Seat, TicketStatus } from '@/types'

const STORAGE_KEY = 'live-cheering-venue-data'

function resetStore() {
  useVenueStore.setState({
    zones: [],
    seats: {},
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
  })
}

describe('venueStore', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    resetStore()
  })

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  describe('addZone', () => {
    it('should create a zone with correct number of seats', () => {
      const store = useVenueStore.getState()
      const zoneId = store.addZone('A区', 3, 4, '#ff0000')

      const state = useVenueStore.getState()
      expect(state.zones).toHaveLength(1)
      expect(state.zones[0].name).toBe('A区')
      expect(state.zones[0].rows).toBe(3)
      expect(state.zones[0].cols).toBe(4)
      expect(state.zones[0].color).toBe('#ff0000')

      const seats = state.seats[zoneId]
      expect(seats).toBeDefined()
      expect(seats).toHaveLength(3 * 4)
    })

    it('should generate seats with correct properties', () => {
      const store = useVenueStore.getState()
      const zoneId = store.addZone('B区', 2, 2, '#00ff00')

      const seats = useVenueStore.getState().seats[zoneId]
      expect(seats).toHaveLength(4)

      const firstSeat = seats.find((s: Seat) => s.row === 0 && s.col === 0)
      expect(firstSeat).toBeDefined()
      expect(firstSeat!.seatNumber).toBe('1-1')
      expect(firstSeat!.zoneId).toBe(zoneId)
      expect(firstSeat!.memberName).toBe('')
      expect(firstSeat!.ticketStatus).toBe('none')
      expect(firstSeat!.isObstructed).toBe(false)
      expect(firstSeat!.activityLog).toEqual([])

      const lastSeat = seats.find((s: Seat) => s.row === 1 && s.col === 1)
      expect(lastSeat).toBeDefined()
      expect(lastSeat!.seatNumber).toBe('2-2')
    })

    it('should generate unique seat IDs', () => {
      const store = useVenueStore.getState()
      const zoneId = store.addZone('C区', 3, 3, '#0000ff')

      const seats = useVenueStore.getState().seats[zoneId]
      const ids = new Set(seats.map((s: Seat) => s.id))
      expect(ids.size).toBe(seats.length)
    })

    it('should record history when recordHistory is true', () => {
      const store = useVenueStore.getState()
      store.addZone('D区', 2, 2, '#ff00ff', true)

      const state = useVenueStore.getState()
      expect(state.past).toHaveLength(1)
      expect(state.past[0].type).toBe('addZone')
      expect(state.past[0].label).toBe('创建区域「D区」')
      expect(state.canUndo).toBe(true)
      expect(state.canRedo).toBe(false)
    })

    it('should not record history when recordHistory is false', () => {
      const store = useVenueStore.getState()
      store.addZone('E区', 2, 2, '#ffff00', false)

      const state = useVenueStore.getState()
      expect(state.past).toHaveLength(0)
      expect(state.canUndo).toBe(false)
    })
  })

  describe('updateSeat', () => {
    let zoneId: string
    let seatId: string

    beforeEach(() => {
      const store = useVenueStore.getState()
      zoneId = store.addZone('测试区', 3, 3, '#ff0000')
      const seats = useVenueStore.getState().seats[zoneId]
      seatId = seats[0].id
      useVenueStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
    })

    it('should update member name and log assignMember activity', () => {
      const store = useVenueStore.getState()
      store.updateSeat(zoneId, seatId, { memberName: '张三' }, false)

      const seat = useVenueStore.getState().seats[zoneId].find((s: Seat) => s.id === seatId)
      expect(seat!.memberName).toBe('张三')
      expect(seat!.activityLog).toHaveLength(1)
      expect(seat!.activityLog[0].type).toBe('assignMember')
      expect(seat!.activityLog[0].newValue).toBe('张三')
      expect(seat!.activityLog[0].fieldName).toBe('memberName')
      expect(seat!.activityLog[0].author).toBe('我')
    })

    it('should update ticket status and log changeTicketStatus activity', () => {
      const store = useVenueStore.getState()
      store.updateSeat(zoneId, seatId, { ticketStatus: 'confirmed' as TicketStatus }, false)

      const seat = useVenueStore.getState().seats[zoneId].find((s: Seat) => s.id === seatId)
      expect(seat!.ticketStatus).toBe('confirmed')
      expect(seat!.activityLog).toHaveLength(1)
      expect(seat!.activityLog[0].type).toBe('changeTicketStatus')
      expect(seat!.activityLog[0].oldValue).toBe('none')
      expect(seat!.activityLog[0].newValue).toBe('confirmed')
    })

    it('should log multiple activities when multiple fields change', () => {
      const store = useVenueStore.getState()
      store.updateSeat(zoneId, seatId, {
        memberName: '李四',
        ticketStatus: 'pending' as TicketStatus,
        cheeringColor: '#ff0000',
      }, false)

      const seat = useVenueStore.getState().seats[zoneId].find((s: Seat) => s.id === seatId)
      expect(seat!.activityLog.length).toBeGreaterThanOrEqual(3)
      const logTypes = seat!.activityLog.map((log: any) => log.type)
      expect(logTypes).toContain('assignMember')
      expect(logTypes).toContain('changeTicketStatus')
      expect(logTypes).toContain('updateCheeringColor')
    })

    it('should not log when values do not change', () => {
      const store = useVenueStore.getState()
      store.updateSeat(zoneId, seatId, { memberName: '' }, false)

      const seat = useVenueStore.getState().seats[zoneId].find((s: Seat) => s.id === seatId)
      expect(seat!.activityLog).toHaveLength(0)
    })

    it('should record history when recordHistory is true', () => {
      const store = useVenueStore.getState()
      store.updateSeat(zoneId, seatId, { memberName: '王五' }, true)

      const state = useVenueStore.getState()
      expect(state.past).toHaveLength(1)
      expect(state.past[0].type).toBe('updateSeat')
      expect(state.past[0].label).toBe('编辑座位')
      expect(state.canUndo).toBe(true)
    })

    it('should toggle obstruction and log activity', () => {
      const store = useVenueStore.getState()
      store.updateSeat(zoneId, seatId, { isObstructed: true, obstructionNote: '柱子遮挡' }, false)

      const seat = useVenueStore.getState().seats[zoneId].find((s: Seat) => s.id === seatId)
      expect(seat!.isObstructed).toBe(true)
      expect(seat!.obstructionNote).toBe('柱子遮挡')
      expect(seat!.activityLog[0].type).toBe('toggleObstruction')
      expect(seat!.activityLog[0].note).toBe('柱子遮挡')
    })

    it('should update supplies and log activity', () => {
      const store = useVenueStore.getState()
      store.updateSeat(zoneId, seatId, { supplies: '荧光棒' }, false)

      const seat = useVenueStore.getState().seats[zoneId].find((s: Seat) => s.id === seatId)
      expect(seat!.supplies).toBe('荧光棒')
      expect(seat!.activityLog[0].type).toBe('updateSupplies')
    })
  })

  describe('batchUpdateSeats', () => {
    let zoneId: string
    let seatIds: string[]

    beforeEach(() => {
      const store = useVenueStore.getState()
      zoneId = store.addZone('批量测试区', 3, 3, '#ff0000')
      const seats = useVenueStore.getState().seats[zoneId]
      seatIds = seats.slice(0, 3).map((s: Seat) => s.id)
      useVenueStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
    })

    it('should batch update ticket status for multiple seats', () => {
      const store = useVenueStore.getState()
      store.batchUpdateSeats(zoneId, seatIds, { ticketStatus: 'exchanged' as TicketStatus }, false)

      const seats = useVenueStore.getState().seats[zoneId]
      const updatedSeats = seats.filter((s: Seat) => seatIds.includes(s.id))
      updatedSeats.forEach((seat: Seat) => {
        expect(seat.ticketStatus).toBe('exchanged')
        expect(seat.activityLog.length).toBeGreaterThan(0)
        expect(seat.activityLog.some((log: any) => log.type === 'changeTicketStatus')).toBe(true)
      })

      const unaffectedSeats = seats.filter((s: Seat) => !seatIds.includes(s.id))
      unaffectedSeats.forEach((seat: Seat) => {
        expect(seat.ticketStatus).toBe('none')
      })
    })

    it('should log changeTicketStatus for each affected seat', () => {
      const store = useVenueStore.getState()
      store.batchUpdateSeats(zoneId, seatIds, { ticketStatus: 'confirmed' as TicketStatus }, false)

      const seats = useVenueStore.getState().seats[zoneId]
      const updatedSeats = seats.filter((s: Seat) => seatIds.includes(s.id))
      updatedSeats.forEach((seat: Seat) => {
        const changeLog = seat.activityLog.find((log: any) => log.type === 'changeTicketStatus')
        expect(changeLog).toBeDefined()
        expect(changeLog!.oldValue).toBe('none')
        expect(changeLog!.newValue).toBe('confirmed')
        expect(changeLog!.author).toBe('我')
      })
    })

    it('should have correct history label for ticket status batch update', () => {
      const store = useVenueStore.getState()
      store.batchUpdateSeats(zoneId, seatIds, { ticketStatus: 'pending' as TicketStatus }, true)

      const state = useVenueStore.getState()
      expect(state.past).toHaveLength(1)
      expect(state.past[0].type).toBe('batchUpdateSeats')
      expect(state.past[0].label).toBe('批量换票状态')
    })

    it('should have correct history label for cheering color batch update', () => {
      const store = useVenueStore.getState()
      store.batchUpdateSeats(zoneId, seatIds, { cheeringColor: '#ff0000' }, true)

      const state = useVenueStore.getState()
      expect(state.past[0].label).toBe('批量上色')
    })

    it('should have correct history label for obstruction batch update', () => {
      const store = useVenueStore.getState()
      store.batchUpdateSeats(zoneId, seatIds, { isObstructed: true }, true)

      const state = useVenueStore.getState()
      expect(state.past[0].label).toBe('批量遮挡标记')
    })

    it('should not affect seats from other zones', () => {
      const store = useVenueStore.getState()
      const otherZoneId = store.addZone('其他区', 2, 2, '#00ff00')
      useVenueStore.setState({ past: [], future: [], canUndo: false, canRedo: false })

      store.batchUpdateSeats(zoneId, seatIds, { ticketStatus: 'exchanged' as TicketStatus }, false)

      const otherSeats = useVenueStore.getState().seats[otherZoneId]
      otherSeats.forEach((seat: Seat) => {
        expect(seat.ticketStatus).toBe('none')
        expect(seat.activityLog).toHaveLength(0)
      })
    })

    it('should handle empty seatIds gracefully', () => {
      const store = useVenueStore.getState()
      store.batchUpdateSeats(zoneId, [], { ticketStatus: 'confirmed' as TicketStatus }, false)

      const seats = useVenueStore.getState().seats[zoneId]
      seats.forEach((seat: Seat) => {
        expect(seat.ticketStatus).toBe('none')
      })
    })

    it('should batch update multiple fields at once', () => {
      const store = useVenueStore.getState()
      store.batchUpdateSeats(zoneId, seatIds, {
        memberName: '批量成员',
        ticketStatus: 'confirmed' as TicketStatus,
        cheeringColor: '#0000ff',
      }, false)

      const seats = useVenueStore.getState().seats[zoneId]
      const updatedSeats = seats.filter((s: Seat) => seatIds.includes(s.id))
      updatedSeats.forEach((seat: Seat) => {
        expect(seat.memberName).toBe('批量成员')
        expect(seat.ticketStatus).toBe('confirmed')
        expect(seat.cheeringColor).toBe('#0000ff')
      })
    })
  })

  describe('clearZoneSeats and undo', () => {
    let zoneId: string

    beforeEach(() => {
      const store = useVenueStore.getState()
      zoneId = store.addZone('清空测试区', 2, 2, '#ff0000')

      const seats = useVenueStore.getState().seats[zoneId]
      seats.forEach((seat: Seat, index: number) => {
        useVenueStore.getState().updateSeat(zoneId, seat.id, {
          memberName: `成员${index}`,
          ticketStatus: 'confirmed' as TicketStatus,
          cheeringColor: `#ff000${index}`,
        }, false)
      })

      useVenueStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
    })

    it('should clear all seat data in the zone', () => {
      const store = useVenueStore.getState()
      store.clearZoneSeats(zoneId, false)

      const seats = useVenueStore.getState().seats[zoneId]
      expect(seats).toHaveLength(4)
      seats.forEach((seat: Seat) => {
        expect(seat.memberName).toBe('')
        expect(seat.ticketStatus).toBe('none')
        expect(seat.cheeringColor).toBe('')
        expect(seat.isObstructed).toBe(false)
        expect(seat.supplies).toBe('')
      })
    })

    it('should record history with correct label', () => {
      const store = useVenueStore.getState()
      store.clearZoneSeats(zoneId, true)

      const state = useVenueStore.getState()
      expect(state.past).toHaveLength(1)
      expect(state.past[0].type).toBe('clearZoneSeats')
      expect(state.past[0].label).toBe('清空区域「清空测试区」')
      expect(state.canUndo).toBe(true)
      expect(state.canRedo).toBe(false)
    })

    it('should restore seat data after undo', () => {
      const store = useVenueStore.getState()

      const beforeSeats = useVenueStore.getState().seats[zoneId].map((s: Seat) => ({ ...s }))

      store.clearZoneSeats(zoneId, true)

      const afterClearSeats = useVenueStore.getState().seats[zoneId]
      afterClearSeats.forEach((seat: Seat) => {
        expect(seat.memberName).toBe('')
      })

      useVenueStore.getState().undo()

      const restoredSeats = useVenueStore.getState().seats[zoneId]
      expect(restoredSeats).toHaveLength(4)

      beforeSeats.forEach((beforeSeat, index) => {
        const restoredSeat = restoredSeats.find((s: Seat) => s.id === beforeSeat.id)
        expect(restoredSeat).toBeDefined()
        expect(restoredSeat!.memberName).toBe(beforeSeat.memberName)
        expect(restoredSeat!.ticketStatus).toBe(beforeSeat.ticketStatus)
        expect(restoredSeat!.cheeringColor).toBe(beforeSeat.cheeringColor)
      })
    })

    it('should restore activityLog after undo', () => {
      const store = useVenueStore.getState()

      const beforeSeats = useVenueStore.getState().seats[zoneId].map((s: Seat) => ({ ...s }))

      store.clearZoneSeats(zoneId, true)
      useVenueStore.getState().undo()

      const restoredSeats = useVenueStore.getState().seats[zoneId]
      beforeSeats.forEach((beforeSeat) => {
        const restoredSeat = restoredSeats.find((s: Seat) => s.id === beforeSeat.id)
        expect(restoredSeat!.activityLog.length).toBe(beforeSeat.activityLog.length)
      })
    })

    it('should redo clear after undo', () => {
      const store = useVenueStore.getState()

      store.clearZoneSeats(zoneId, true)
      useVenueStore.getState().undo()

      const afterUndoState = useVenueStore.getState()
      expect(afterUndoState.canRedo).toBe(true)

      useVenueStore.getState().redo()

      const seats = useVenueStore.getState().seats[zoneId]
      seats.forEach((seat: Seat) => {
        expect(seat.memberName).toBe('')
        expect(seat.ticketStatus).toBe('none')
      })
    })

    it('should set canUndo to false after undoing last action', () => {
      const store = useVenueStore.getState()

      store.clearZoneSeats(zoneId, true)
      expect(useVenueStore.getState().canUndo).toBe(true)

      useVenueStore.getState().undo()
      expect(useVenueStore.getState().canUndo).toBe(false)
      expect(useVenueStore.getState().canRedo).toBe(true)
    })

    it('should set canRedo to false after redoing last action', () => {
      const store = useVenueStore.getState()

      store.clearZoneSeats(zoneId, true)
      useVenueStore.getState().undo()
      useVenueStore.getState().redo()

      const state = useVenueStore.getState()
      expect(state.canRedo).toBe(false)
      expect(state.canUndo).toBe(true)
    })

    it('should not crash when clearing non-existent zone', () => {
      const store = useVenueStore.getState()
      expect(() => {
        store.clearZoneSeats('non-existent-zone', true)
      }).not.toThrow()
    })

    it('should preserve zone after clearing seats', () => {
      const store = useVenueStore.getState()
      store.clearZoneSeats(zoneId, true)

      const state = useVenueStore.getState()
      const zone = state.zones.find((z: any) => z.id === zoneId)
      expect(zone).toBeDefined()
      expect(zone!.name).toBe('清空测试区')
      expect(zone!.rows).toBe(2)
      expect(zone!.cols).toBe(2)
    })
  })
})
