import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminPosPage extends StatefulWidget {
  const AdminPosPage({super.key});

  @override
  State<AdminPosPage> createState() => _AdminPosPageState();
}

class _AdminPosPageState extends State<AdminPosPage> {
  final List<Map<String, dynamic>> _posItems = [
    {'name': 'School Uniform Set (JHS)', 'price': 'GH₵ 120.00', 'stock': 45, 'category': 'Apparel'},
    {'name': 'School Crest Blazer', 'price': 'GH₵ 180.00', 'stock': 28, 'category': 'Apparel'},
    {'name': 'Exercise Book (Pack of 10)', 'price': 'GH₵ 40.00', 'stock': 120, 'category': 'Stationery'},
    {'name': 'Daily Hot Lunch Ticket', 'price': 'GH₵ 15.00', 'stock': 500, 'category': 'Canteen'},
    {'name': 'Mathematical Set (Oxford)', 'price': 'GH₵ 25.00', 'stock': 64, 'category': 'Stationery'},
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/pos'),
      appBar: AppBar(
        title: Text(
          'Digital Wallet & Store POS',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(LucideIcons.qrCode, size: 20, color: isDark ? Colors.white : const Color(0xFF0F172A)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Opening Student ID Barcode Scanner...')),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SlCard(
            padding: const EdgeInsets.all(16),
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withAlpha(isDark ? 50 : 30),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.wallet, size: 28, color: Color(0xFF10B981)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cashless Campus Terminal',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Accept payments via student RFID cards, Parent Wallets, or cash.',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text(
            'STORE & CANTEEN INVENTORY',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._posItems.map((item) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SlCard(
                padding: const EdgeInsets.all(14),
                borderRadius: BorderRadius.circular(16),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(child: Icon(LucideIcons.shoppingBag, size: 18, color: Color(0xFF10B981))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item['name'],
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${item['category']} • ${item['stock']} units left in stock',
                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          item['price'],
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
                        ),
                        const SizedBox(height: 4),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Added "${item['name']}" to checkout cart')),
                            );
                          },
                          child: const Text('Charge', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
