# -*-coding:utf-8-*-

# this code is currently for python 2.7
from __future__ import print_function
from time import sleep
import smbus2 as smbus  # pure-Python, API-compatible drop-in for smbus

# register addresses
REG_INTR_STATUS_1 = 0x00
REG_INTR_STATUS_2 = 0x01

REG_INTR_ENABLE_1 = 0x02
REG_INTR_ENABLE_2 = 0x03

REG_FIFO_WR_PTR = 0x04
REG_OVF_COUNTER = 0x05
REG_FIFO_RD_PTR = 0x06
REG_FIFO_DATA = 0x07
REG_FIFO_CONFIG = 0x08

REG_MODE_CONFIG = 0x09
REG_SPO2_CONFIG = 0x0A
REG_LED1_PA = 0x0C

REG_LED2_PA = 0x0D
REG_PILOT_PA = 0x10
REG_MULTI_LED_CTRL1 = 0x11
REG_MULTI_LED_CTRL2 = 0x12

REG_TEMP_INTR = 0x1F
REG_TEMP_FRAC = 0x20
REG_TEMP_CONFIG = 0x21
REG_PROX_INT_THRESH = 0x30
REG_REV_ID = 0xFE
REG_PART_ID = 0xFF


class MAX30102():
    # by default, this assumes that the device is at 0x57 on channel 1
    def __init__(self, channel=1, address=0x57):
        #print("Channel: {0}, address: {1}".format(channel, address))
        self.address = address
        self.channel = channel
        self.bus = smbus.SMBus(self.channel)

        # Fail early with a clear message if the chip isn't answering at all
        # (usually a loose SDA/SCL wire or unsoldered header pins).
        part_id = self._read_byte(REG_PART_ID)
        if part_id != 0x15:
            print("[MAX30102] Warning: unexpected part ID 0x{0:02x} (expected 0x15)".format(part_id))

        self.reset()

        sleep(1)  # wait 1 sec

        # read & clear interrupt register (read 1 byte)
        reg_data = self._read_block(REG_INTR_STATUS_1, 1)
        # print("[SETUP] reset complete with interrupt register0: {0}".format(reg_data))
        self.setup()
        # print("[SETUP] setup complete")

    # ------------------------------------------------------------------
    # I2C helpers: retry a few times, because a single glitch on the bus
    # (loose jumper, electrical noise) shouldn't crash the whole program.
    # ------------------------------------------------------------------
    def _write(self, reg, values, retries=3):
        for attempt in range(retries):
            try:
                self.bus.write_i2c_block_data(self.address, reg, values)
                return
            except OSError:
                if attempt == retries - 1:
                    raise
                sleep(0.05)

    def _read_block(self, reg, length, retries=3):
        for attempt in range(retries):
            try:
                return self.bus.read_i2c_block_data(self.address, reg, length)
            except OSError:
                if attempt == retries - 1:
                    raise
                sleep(0.05)

    def _read_byte(self, reg, retries=3):
        for attempt in range(retries):
            try:
                return self.bus.read_byte_data(self.address, reg)
            except OSError:
                if attempt == retries - 1:
                    raise
                sleep(0.05)

    def shutdown(self):
        """
        Shutdown the device.
        """
        self._write(REG_MODE_CONFIG, [0x80])

    def reset(self):
        """
        Reset the device, this will clear all settings,
        so after running this, run setup() again.
        """
        try:
            self._write(REG_MODE_CONFIG, [0x40])
        except OSError:
            # Many MAX30102 boards (especially clones) reset instantly when
            # they receive this bit and don't acknowledge the write, so Linux
            # reports "[Errno 5] Input/output error". The reset still
            # happens, so it's safe to ignore the error here.
            pass
        sleep(0.1)

    def setup(self, led_mode=0x03):
        """
        This will setup the device with the values written in sample Arduino code.
        """
        # INTR setting
        # 0xc0 : A_FULL_EN and PPG_RDY_EN = Interrupt will be triggered when
        # fifo almost full & new fifo data ready
        self._write(REG_INTR_ENABLE_1, [0xc0])
        self._write(REG_INTR_ENABLE_2, [0x00])

        # FIFO_WR_PTR[4:0]
        self._write(REG_FIFO_WR_PTR, [0x00])
        # OVF_COUNTER[4:0]
        self._write(REG_OVF_COUNTER, [0x00])
        # FIFO_RD_PTR[4:0]
        self._write(REG_FIFO_RD_PTR, [0x00])

        # 0b 0100 1111
        # sample avg = 4, fifo rollover = false, fifo almost full = 17
        self._write(REG_FIFO_CONFIG, [0x4f])

        # 0x02 for read-only, 0x03 for SpO2 mode, 0x07 multimode LED
        self._write(REG_MODE_CONFIG, [led_mode])
        # 0b 0010 0111
        # SPO2_ADC range = 4096nA, SPO2 sample rate = 100Hz, LED pulse-width = 411uS
        self._write(REG_SPO2_CONFIG, [0x27])

        # choose value for ~7mA for LED1
        self._write(REG_LED1_PA, [0x24])
        # choose value for ~7mA for LED2
        self._write(REG_LED2_PA, [0x24])
        # choose value fro ~25mA for Pilot LED
        self._write(REG_PILOT_PA, [0x7f])

    # this won't validate the arguments!
    # use when changing the values from default
    def set_config(self, reg, value):
        self._write(reg, value)

    def get_data_present(self):
        read_ptr = self._read_byte(REG_FIFO_RD_PTR)
        write_ptr = self._read_byte(REG_FIFO_WR_PTR)
        if read_ptr == write_ptr:
            return 0
        else:
            num_samples = write_ptr - read_ptr
            # account for pointer wrap around
            if num_samples < 0:
                num_samples += 32
            return num_samples

    def read_fifo(self):
        """
        This function will read the data register.
        """
        red_led = None
        ir_led = None

        # read 1 byte from registers (values are discarded)
        reg_INTR1 = self._read_block(REG_INTR_STATUS_1, 1)
        reg_INTR2 = self._read_block(REG_INTR_STATUS_2, 1)

        # read 6-byte data from the device
        d = self._read_block(REG_FIFO_DATA, 6)

        # mask MSB [23:18]
        red_led = (d[0] << 16 | d[1] << 8 | d[2]) & 0x03FFFF
        ir_led = (d[3] << 16 | d[4] << 8 | d[5]) & 0x03FFFF

        return red_led, ir_led

    def read_sequential(self, amount=100):
        """
        This function will read the red-led and ir-led `amount` times.
        This works as blocking function.
        """
        red_buf = []
        ir_buf = []
        count = amount
        while count > 0:
            num_bytes = self.get_data_present()
            while num_bytes > 0:
                red, ir = self.read_fifo()

                red_buf.append(red)
                ir_buf.append(ir)
                num_bytes -= 1
                count -= 1

        return red_buf, ir_buf
