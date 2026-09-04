import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class AdminBroadcastPage extends StatelessWidget {
  const AdminBroadcastPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<CommunicationBloc>()..add(LoadNoticesEvent()),
      child: const _AdminBroadcastView(),
    );
  }
}

class _AdminBroadcastView extends StatefulWidget {
  const _AdminBroadcastView();

  @override
  State<_AdminBroadcastView> createState() => _AdminBroadcastViewState();
}

class _AdminBroadcastViewState extends State<_AdminBroadcastView> {
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  String _targetAudience = 'All Parents';
  bool _sendSMS = true;
  bool _sendAppNotification = true;

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _dispatchBroadcast(BuildContext context) {
    final title = _titleController.text.trim();
    final message = _messageController.text.trim();

    if (title.isEmpty || message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill out the broadcast title and message body.'),
          backgroundColor: AppColors.rose,
        ),
      );
      return;
    }

    final channel = _sendSMS && _sendAppNotification
        ? 'ALL'
        : _sendSMS
            ? 'SMS'
            : 'PUSH';

    context.read<CommunicationBloc>().add(
          SendBroadcastAlertEvent(
            title: title,
            message: message,
            channel: channel,
            targetRole: _targetAudience,
          ),
        );
  }

  void _triggerEmergencyLockdown(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(LucideIcons.alertTriangle, color: AppColors.rose, size: 22),
            SizedBox(width: 8),
            Text('Campus Emergency Lockdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: const Text(
          'This will trigger an immediate emergency alert to ALL parents, teachers, and security gates via SMS and Push notification. Are you sure?',
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<CommunicationBloc>().add(
                    const TriggerEmergencyLockdownBroadcastEvent('Main Campus'),
                  );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.rose, foregroundColor: Colors.white),
            child: const Text('Initiate Lockdown Alert'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<CommunicationBloc, CommunicationState>(
      listener: (context, state) {
        if (state is BroadcastSentSuccessState) {
          _titleController.clear();
          _messageController.clear();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.emerald,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state is EmergencyLockdownTriggeredState) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🚨 EMERGENCY LOCKDOWN PROTOCOL ACTIVE FOR ${state.campusName}! Alerts dispatched.'),
              backgroundColor: AppColors.rose,
              duration: const Duration(seconds: 5),
            ),
          );
        } else if (state is CommunicationError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.rose),
          );
        }
      },
      builder: (context, state) {
        final notices = state is CommunicationNoticesLoaded ? state.notices : <NoticeEntity>[];
        final isLoading = state is CommunicationLoading;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Instant Broadcast & Alerts', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.rotateCw, size: 20),
                onPressed: () => context.read<CommunicationBloc>().add(LoadNoticesEvent()),
              ),
            ],
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Emergency Quick Lockdown Banner
                  SlCard(
                    borderColor: AppColors.rose.withAlpha(60),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'CAMPUS SAFETY PROTOCOL',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.roseLight, letterSpacing: 1),
                            ),
                            SizedBox(height: 2),
                            Text('Emergency Lockdown Alert', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                          ],
                        ),
                        ElevatedButton.icon(
                          onPressed: () => _triggerEmergencyLockdown(context),
                          icon: const Icon(LucideIcons.alertCircle, size: 14),
                          label: const Text('Lockdown'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.rose,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  SlCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('AUDIENCE TARGET', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted)),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          initialValue: _targetAudience,
                          decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
                          items: ['All Parents', 'All Faculty & Staff', 'Class 1A Parents', 'Class 2B Parents', 'Whole School Community'].map((a) {
                            return DropdownMenuItem(value: a, child: Text(a, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)));
                          }).toList(),
                          onChanged: (v) {
                            if (v != null) setState(() => _targetAudience = v);
                          },
                        ),
                        const SizedBox(height: 16),
                        SlInput(
                          controller: _titleController,
                          label: 'ALERT HEADLINE / TITLE',
                          hintText: 'e.g. Early Dismissal / Mid-Term Fee Notice',
                          prefixIcon: const Icon(LucideIcons.type, size: 18),
                        ),
                        const SizedBox(height: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'MESSAGE CONTENT',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextField(
                              controller: _messageController,
                              maxLines: 4,
                              decoration: InputDecoration(
                                hintText: 'Compose your multi-channel broadcast announcement here...',
                                hintStyle: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Text('DELIVERY CHANNELS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted)),
                        const SizedBox(height: 8),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('SMS (Carrier Delivery Hub)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          subtitle: const Text('Direct SMS dispatch via Arkasel SMS gateway', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                          value: _sendSMS,
                          activeThumbColor: AppColors.primaryLight,
                          onChanged: (v) => setState(() => _sendSMS = v),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Push Notification', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          subtitle: const Text('Mobile app banner notification', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                          value: _sendAppNotification,
                          activeThumbColor: AppColors.primaryLight,
                          onChanged: (v) => setState(() => _sendAppNotification = v),
                        ),
                        const SizedBox(height: 20),
                        SlButton(
                          text: 'Dispatch Urgent Broadcast',
                          icon: const Icon(LucideIcons.send, size: 18, color: Colors.white),
                          isLoading: isLoading,
                          onPressed: () => _dispatchBroadcast(context),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Recent Broadcasts History
                  const Text(
                    'RECENT BROADCAST DISPATCHES',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                  ),
                  const SizedBox(height: 12),

                  if (notices.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No previous broadcasts sent yet.', style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    )
                  else
                    ...notices.map((n) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: SlCard(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(n.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                  SlBadge(
                                    text: n.channel,
                                    variant: SlBadgeVariant.primary,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                n.message,
                                style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Target: ${n.targetRole}',
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primaryLight),
                                  ),
                                  Text(
                                    '${n.createdAt.day}/${n.createdAt.month}/${n.createdAt.year}',
                                    style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
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
            ),
          ),
        );
      },
    );
  }
}
