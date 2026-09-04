import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminScholarshipsPage extends StatelessWidget {
  const AdminScholarshipsPage({super.key});

  final List<Map<String, dynamic>> _scholarships = const [
    {
      'name': 'Bright Future STEM Excellence Bursary',
      'sponsor': 'SchoolLinx Foundation Ghana',
      'beneficiaries': 14,
      'coverage': '100% Tuition & Uniforms',
      'totalAnnualValue': 'GH₵ 34,500.00',
    },
    {
      'name': 'PTA Hardship Fee Waiver Scheme',
      'sponsor': 'School PTA Executive Committee',
      'beneficiaries': 8,
      'coverage': '50% Tuition Subsidy',
      'totalAnnualValue': 'GH₵ 12,000.00',
    },
    {
      'name': 'Alumni Sports & Athletics Fellowship',
      'sponsor': 'Old Students Association',
      'beneficiaries': 5,
      'coverage': 'Full Boarding & Gear',
      'totalAnnualValue': 'GH₵ 18,000.00',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/scholarships'),
      appBar: AppBar(
        title: Text(
          'Scholarships & Fee Waivers',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ..._scholarships.map((s) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SlCard(
                padding: const EdgeInsets.all(16),
                borderRadius: BorderRadius.circular(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            s['name']!,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        const SlBadge(text: 'ACTIVE SCHEME', variant: SlBadgeVariant.primary),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Sponsor: ${s['sponsor']}',
                      style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                    ),
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Enrolled Beneficiaries:', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                        Text('${s['beneficiaries']} Students', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Coverage Type:', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                        Text(s['coverage']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF10B981))),
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
